import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { pool } from "../src/db/pool";

const app = createApp();
let categoryId: number;

async function signup(name: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").send({
    email: `${name}@vitstudent.ac.in`, password: "Test@12345", fullName: `User ${name}`,
  });
  expect(res.status).toBe(201);
  return { agent, id: res.body.user.id as number };
}

const listingBody = () => ({
  categoryId, title: "Casio Calculator", description: "fx-991EX, works fine",
  condition: "good", listingType: "sale", price: 500,
});

beforeEach(async () => {
  await pool.query("TRUNCATE TABLE users, categories, campus_locations RESTART IDENTITY CASCADE");
  const c = await pool.query("INSERT INTO categories (name, slug) VALUES ('Electronics','electronics') RETURNING id");
  categoryId = c.rows[0].id;
});

afterAll(() => pool.end());

describe("auth", () => {
  it("registers, reads /me, logs in; rejects bad credentials and non-VIT emails", async () => {
    const { agent } = await signup("rohit");
    expect((await agent.get("/api/auth/me")).body.user.email).toBe("rohit@vitstudent.ac.in");

    const ok = await request(app).post("/api/auth/login").send({ email: "rohit@vitstudent.ac.in", password: "Test@12345" });
    expect(ok.status).toBe(200);
    const bad = await request(app).post("/api/auth/login").send({ email: "rohit@vitstudent.ac.in", password: "wrong-pass1" });
    expect(bad.status).toBe(401);

    const dup = await request(app).post("/api/auth/register").send({ email: "rohit@vitstudent.ac.in", password: "Test@12345", fullName: "Dup" });
    expect(dup.status).toBe(409);
    const foreign = await request(app).post("/api/auth/register").send({ email: "x@gmail.com", password: "Test@12345", fullName: "X Y" });
    expect(foreign.status).toBe(400);
  });

  it("blocks unauthenticated access", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).post("/api/listings").send(listingBody())).status).toBe(401);
  });
});

describe("listings", () => {
  it("creates, searches with filters, and enforces ownership", async () => {
    const seller = await signup("seller");
    const other = await signup("other");

    const created = await seller.agent.post("/api/listings").send(listingBody());
    expect(created.status).toBe(201);
    const id = created.body.listing.id;

    const found = await request(app).get("/api/listings").query({ q: "calc", maxPrice: 600, category: "electronics" });
    expect(found.body.total).toBe(1);
    const none = await request(app).get("/api/listings").query({ maxPrice: 100 });
    expect(none.body.total).toBe(0);

    expect((await other.agent.put(`/api/listings/${id}`).send(listingBody())).status).toBe(403);
    expect((await seller.agent.post("/api/listings").send({ ...listingBody(), price: -5 })).status).toBe(400);
  });
});

describe("purchase flow", () => {
  it("request -> accept -> complete, and the listing leaves search", async () => {
    const seller = await signup("seller");
    const buyer = await signup("buyer");
    const id = (await seller.agent.post("/api/listings").send(listingBody())).body.listing.id;

    const reqRes = await buyer.agent.post(`/api/listings/${id}/requests`).send({ message: "Interested" });
    expect(reqRes.status).toBe(201);
    const reqId = reqRes.body.request.id;

    expect((await buyer.agent.post(`/api/requests/${reqId}/accept`)).status).toBe(403);

    const acc = await seller.agent.post(`/api/requests/${reqId}/accept`);
    expect(acc.status).toBe(200);
    const txId = acc.body.transaction.id;

    expect((await request(app).get(`/api/listings/${id}`)).body.listing.status).toBe("reserved");
    expect((await request(app).get("/api/listings")).body.total).toBe(0);

    expect((await buyer.agent.post(`/api/transactions/${txId}/complete`)).status).toBe(403);
    expect((await seller.agent.post(`/api/transactions/${txId}/complete`)).status).toBe(200);
    expect((await request(app).get(`/api/listings/${id}`)).body.listing.status).toBe("sold");
  });

  it("rejects buying your own listing", async () => {
    const seller = await signup("seller");
    const id = (await seller.agent.post("/api/listings").send(listingBody())).body.listing.id;
    expect((await seller.agent.post(`/api/listings/${id}/requests`).send({})).status).toBe(400);
  });

  it("two simultaneous accepts: exactly one wins, one transaction row", async () => {
    const seller = await signup("seller");
    const b1 = await signup("buyer1");
    const b2 = await signup("buyer2");
    const id = (await seller.agent.post("/api/listings").send(listingBody())).body.listing.id;

    const r1 = (await b1.agent.post(`/api/listings/${id}/requests`).send({})).body.request.id;
    const r2 = (await b2.agent.post(`/api/listings/${id}/requests`).send({})).body.request.id;

    const results = await Promise.all([
      seller.agent.post(`/api/requests/${r1}/accept`),
      seller.agent.post(`/api/requests/${r2}/accept`),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);

    const count = await pool.query("SELECT COUNT(*)::int AS n FROM transactions WHERE listing_id = $1", [id]);
    expect(count.rows[0].n).toBe(1);
  });
});