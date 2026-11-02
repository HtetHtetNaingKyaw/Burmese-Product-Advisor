/**
 * Phase 2 smoke test — business profiles, products, ownership and validation.
 *
 *   pnpm dev            (terminal 1)
 *   pnpm smoke:phase2   (terminal 2)
 *
 * Creates two throwaway users and deletes them (cascade) at the end.
 */
import "dotenv/config";
import { Client } from "pg";

const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const stamp = Date.now();
const emailA = `phase2-a-${stamp}@example.com`;
const emailB = `phase2-b-${stamp}@example.com`;
const password = "burmese-advisor-1234";

type ProductJson = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  ingredients: string | null;
  price: number | null;
  benefits: string | null;
  uniqueSellingPoints: string | null;
  targetCustomers: string | null;
};

type ProfileJson = {
  id: string;
  businessName: string;
  businessType: string;
  description: string | null;
  location: string | null;
  contact: string | null;
};

type ApiJson = {
  error?: string;
  fieldErrors?: Record<string, string>;
  profile?: ProfileJson;
  product?: ProductJson;
  products?: ProductJson[];
  user?: { id: string };
};

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}`, detail ?? "");
  }
}

async function api(
  cookie: string | null,
  path: string,
  init: { method?: string; body?: unknown; rawBody?: string } = {},
) {
  const hasBody = init.body !== undefined || init.rawBody !== undefined;
  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(hasBody ? { "content-type": "application/json" } : {}),
    },
    body: hasBody ? (init.rawBody ?? JSON.stringify(init.body)) : undefined,
  });

  const text = await response.text();
  let json: ApiJson | null = null;
  try {
    json = text ? (JSON.parse(text) as ApiJson) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json };
}

async function page(cookie: string | null, path: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: "manual",
  });
  return { status: response.status, text: await response.text() };
}

async function signUp(email: string, name: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password, name }),
  });
  if (!response.ok) {
    throw new Error(`sign-up failed for ${email}: ${response.status}`);
  }
  return response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
}

async function cleanup() {
  const connectionString = (process.env.DATABASE_URL ?? "").split("?")[0];
  if (!connectionString) return;
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query('DELETE FROM "user" WHERE email = ANY($1::text[])', [
      [emailA, emailB],
    ]);
  } catch (error) {
    console.error("cleanup failed:", error);
  } finally {
    await client.end().catch(() => undefined);
  }
}

const fullProduct = {
  name: "A Product Alpha",
  category: "Food",
  description: "Contains unique-alpha-word for search",
  ingredients: "Rice, oil",
  price: 5000,
  benefits: "Tasty and filling",
  uniqueSellingPoints: "Handmade daily",
  targetCustomers: "Students",
};

async function main() {
  console.log(`Phase 2 smoke test against ${baseUrl}\n`);

  console.log("Unauthenticated access");
  check(
    "GET /api/business-profile → 401",
    (await api(null, "/api/business-profile")).status === 401,
  );
  check(
    "POST /api/business-profile → 401",
    (await api(null, "/api/business-profile", { method: "POST", body: {} })).status === 401,
  );
  check("GET /api/products → 401", (await api(null, "/api/products")).status === 401);
  check(
    "POST /api/products → 401",
    (await api(null, "/api/products", { method: "POST", body: {} })).status === 401,
  );
  check(
    "GET /api/products/:id → 401",
    (await api(null, "/api/products/whatever")).status === 401,
  );

  for (const path of ["/dashboard", "/dashboard/business", "/dashboard/products"]) {
    const result = await page(null, path);
    check(
      `unauthenticated ${path} redirects`,
      result.status >= 300 && result.status < 400,
      result.status,
    );
  }

  const cookieA = await signUp(emailA, "စမ်းသပ် A");
  const cookieB = await signUp(emailB, "စမ်းသပ် B");
  check("two test users signed up", Boolean(cookieA && cookieB));

  console.log("\nBusiness profile (user A)");
  check("A GET profile → 404", (await api(cookieA, "/api/business-profile")).status === 404);

  const invalidProfile = await api(cookieA, "/api/business-profile", {
    method: "POST",
    body: { businessType: "Food" },
  });
  check(
    "A POST profile without name → 400 + field error",
    invalidProfile.status === 400 && Boolean(invalidProfile.json?.fieldErrors?.businessName),
    invalidProfile.json,
  );

  const createdA = await api(cookieA, "/api/business-profile", {
    method: "POST",
    body: {
      businessName: "A Business",
      businessType: "Food",
      description: "A description",
      location: "Mandalay",
      contact: "09 111 111 111",
    },
  });
  const aProfile = createdA.json?.profile;
  check(
    "A POST profile → 201",
    createdA.status === 201 && aProfile?.businessName === "A Business",
    createdA.json,
  );

  check(
    "A POST second profile → 409",
    (
      await api(cookieA, "/api/business-profile", {
        method: "POST",
        body: { businessName: "Duplicate", businessType: "Food" },
      })
    ).status === 409,
  );

  const gotA = await api(cookieA, "/api/business-profile");
  check(
    "A GET profile → 200 with own data",
    gotA.status === 200 && gotA.json?.profile?.businessName === "A Business",
    gotA.json,
  );

  const patchedA = await api(cookieA, "/api/business-profile", {
    method: "PATCH",
    body: {
      businessName: "A Business Updated",
      businessType: "Food",
      description: "",
      location: "",
      contact: "",
    },
  });
  check(
    "A PATCH profile → 200",
    patchedA.status === 200 &&
      patchedA.json?.profile?.businessName === "A Business Updated",
    patchedA.json,
  );

  const businessPage = await page(cookieA, "/dashboard/business");
  check(
    "A /dashboard/business renders own profile",
    businessPage.status === 200 && businessPage.text.includes("A Business Updated"),
    businessPage.status,
  );

  console.log("\nBusiness profile isolation");
  const createdB = await api(cookieB, "/api/business-profile", {
    method: "POST",
    body: { businessName: "B Business", businessType: "Craft" },
  });
  const bProfile = createdB.json?.profile;
  check(
    "B POST profile → 201",
    createdB.status === 201 && Boolean(bProfile?.id),
    createdB.json,
  );

  const gotB = await api(cookieB, "/api/business-profile");
  check(
    "B GET profile returns B's own profile",
    gotB.status === 200 && gotB.json?.profile?.businessName === "B Business",
    gotB.json,
  );

  const sessionB = await api(cookieB, "/api/auth/get-session");
  check("B session resolves", Boolean(sessionB.json?.user?.id));

  console.log("\nProduct validation");
  const noName = await api(cookieA, "/api/products", {
    method: "POST",
    body: { name: "" },
  });
  check(
    "POST product without name → 400",
    noName.status === 400 && Boolean(noName.json?.fieldErrors?.name),
    noName.json,
  );

  const negativePrice = await api(cookieA, "/api/products", {
    method: "POST",
    body: { name: "Negative", price: -5 },
  });
  check(
    "POST product with negative price → 400",
    negativePrice.status === 400 && Boolean(negativePrice.json?.fieldErrors?.price),
    negativePrice.json,
  );

  const badPrice = await api(cookieA, "/api/products", {
    method: "POST",
    body: { name: "Bad price", price: "abc" },
  });
  check(
    "POST product with non-numeric price → 400",
    badPrice.status === 400 && Boolean(badPrice.json?.fieldErrors?.price),
    badPrice.json,
  );

  check(
    "POST product with malformed JSON → 400",
    (
      await api(cookieA, "/api/products", {
        method: "POST",
        rawBody: "{not-json",
      })
    ).status === 400,
  );

  console.log("\nProduct CRUD (user A)");
  const createdP1 = await api(cookieA, "/api/products", {
    method: "POST",
    body: fullProduct,
  });
  const p1 = createdP1.json?.product;
  check(
    "A POST full product → 201",
    createdP1.status === 201 &&
      p1?.name === fullProduct.name &&
      p1?.price === 5000 &&
      p1?.ingredients === fullProduct.ingredients,
    createdP1.json,
  );

  const createdP2 = await api(cookieA, "/api/products", {
    method: "POST",
    body: { name: "A Product Beta", price: "" },
  });
  const p2 = createdP2.json?.product;
  check(
    "A POST minimal product (empty price) → 201, price null",
    createdP2.status === 201 && p2?.price === null,
    createdP2.json,
  );

  const spoof = await api(cookieA, "/api/products", {
    method: "POST",
    body: {
      name: "Spoof attempt",
      userId: sessionB.json?.user?.id,
      businessProfileId: bProfile?.id,
    },
  });
  const p3 = spoof.json?.product;
  check("POST ignores client-supplied ownership → 201", spoof.status === 201, spoof.json);
  check(
    "spoofed product is still owned by A",
    p3 ? (await api(cookieB, `/api/products/${p3.id}`)).status === 404 : false,
  );

  const listAll = await api(cookieA, "/api/products");
  check(
    "A GET products → 3",
    listAll.status === 200 && listAll.json?.products?.length === 3,
    listAll.json?.products?.length,
  );

  const search = await api(cookieA, "/api/products?q=unique-alpha-word");
  check(
    "A search by description → 1",
    search.status === 200 &&
      search.json?.products?.length === 1 &&
      search.json.products[0]?.id === p1?.id,
  );

  const filter = await api(cookieA, "/api/products?category=Food");
  check(
    "A filter by category → 1",
    filter.status === 200 && filter.json?.products?.length === 1,
  );

  const noMatch = await api(cookieA, "/api/products?q=zzz-no-such-product");
  check(
    "A search with no match → 0",
    noMatch.status === 200 && noMatch.json?.products?.length === 0,
  );

  const gotP1 = await api(cookieA, `/api/products/${p1?.id}`);
  check("A GET own product → 200", gotP1.status === 200, gotP1.json);

  const detailPageA = await page(cookieA, `/dashboard/products/${p1?.id}`);
  check(
    "A /dashboard/products/[id] renders product",
    detailPageA.status === 200 && detailPageA.text.includes(fullProduct.name),
    detailPageA.status,
  );

  console.log("\nCross-user product isolation");
  check(
    "B GET A's product → 404",
    (await api(cookieB, `/api/products/${p1?.id}`)).status === 404,
  );

  const crossPatch = await api(cookieB, `/api/products/${p1?.id}`, {
    method: "PATCH",
    body: { name: "HACKED BY B" },
  });
  check("B PATCH A's product → 404", crossPatch.status === 404, crossPatch.json);

  const afterCross = await api(cookieA, `/api/products/${p1?.id}`);
  check(
    "A's product is unchanged after B's attempt",
    afterCross.json?.product?.name === fullProduct.name,
    afterCross.json?.product?.name,
  );

  check(
    "B DELETE A's product → 404",
    (await api(cookieB, `/api/products/${p1?.id}`, { method: "DELETE" })).status === 404,
  );
  check(
    "A's product still exists after B's delete attempt",
    (await api(cookieA, `/api/products/${p1?.id}`)).status === 200,
  );

  const detailPageB = await page(cookieB, `/dashboard/products/${p1?.id}`);
  check(
    "B /dashboard/products/[id] → 404 page",
    detailPageB.status === 404,
    detailPageB.status,
  );

  console.log("\nProduct update and delete");
  const patchedP1 = await api(cookieA, `/api/products/${p1?.id}`, {
    method: "PATCH",
    body: { ...fullProduct, name: "A Product Alpha Updated", price: 6000 },
  });
  check(
    "A PATCH product → 200",
    patchedP1.status === 200 &&
      patchedP1.json?.product?.name === "A Product Alpha Updated" &&
      patchedP1.json?.product?.price === 6000,
    patchedP1.json,
  );

  const updatedPage = await page(cookieA, `/dashboard/products/${p1?.id}`);
  check(
    "updated name appears on detail page",
    updatedPage.status === 200 && updatedPage.text.includes("A Product Alpha Updated"),
  );

  check(
    "A DELETE own product → 204",
    (
      await api(cookieA, `/api/products/${p3?.id}`, { method: "DELETE" })
    ).status === 204,
  );
  check(
    "deleted product → 404",
    (await api(cookieA, `/api/products/${p3?.id}`)).status === 404,
  );
  check(
    "A list after delete → 2",
    (await api(cookieA, "/api/products")).json?.products?.length === 2,
  );

  const bCreated = await api(cookieB, "/api/products", {
    method: "POST",
    body: { name: "B Product" },
  });
  const bProduct = bCreated.json?.product;
  check("B creates own product → 201", bCreated.status === 201);

  const bList = await api(cookieB, "/api/products");
  check(
    "B sees only B's product",
    bList.status === 200 &&
      bList.json?.products?.length === 1 &&
      bList.json.products[0]?.name === "B Product",
    bList.json?.products,
  );

  console.log("\nCascade delete");
  check(
    "A DELETE business profile → 204",
    (await api(cookieA, "/api/business-profile", { method: "DELETE" })).status === 204,
  );
  check(
    "A profile gone → 404",
    (await api(cookieA, "/api/business-profile")).status === 404,
  );
  check(
    "A products removed by cascade → 0",
    (await api(cookieA, "/api/products")).json?.products?.length === 0,
  );
  check(
    "A's deleted product page → 404",
    (await page(cookieA, `/dashboard/products/${p1?.id}`)).status === 404,
  );
  check(
    "A POST product without profile → 409",
    (
      await api(cookieA, "/api/products", {
        method: "POST",
        body: { name: "No profile" },
      })
    ).status === 409,
  );

  check(
    "B DELETE own product → 204",
    (
      await api(cookieB, `/api/products/${bProduct?.id}`, { method: "DELETE" })
    ).status === 204,
  );
  check(
    "B DELETE own profile → 204",
    (await api(cookieB, "/api/business-profile", { method: "DELETE" })).status === 204,
  );
}

main()
  .catch((error) => {
    failures += 1;
    console.error(
      `\nSmoke test aborted: ${error instanceof Error ? error.message : error}`,
    );
    console.error("Is `pnpm dev` running on " + baseUrl + "?");
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${failures === 0 ? "All checks passed." : `${failures} check(s) failed.`}`);
    process.exit(failures === 0 ? 0 : 1);
  });

export {};
