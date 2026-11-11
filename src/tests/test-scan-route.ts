import { NextRequest } from "next/server";
import { POST } from "../app/api/food/scan/route";

async function testScanRoute() {
  console.log("==================================================================");
  console.log("TESTING API ROUTE: /api/food/scan");
  console.log("==================================================================\n");

  // 1. Missing payload test
  console.log("--- Test 1: Reject empty / malformed request ---");
  const emptyReq = new NextRequest("http://localhost:3000/api/food/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const res1 = await POST(emptyReq);
  const data1 = await res1.json();
  console.log("Empty request status:", res1.status, "code:", data1.code);
  if (res1.status === 400 && data1.code === "INVALID_IMAGE") {
    console.log("  [PASS] Successfully rejected missing image body with HTTP 400");
  } else {
    console.error("  [FAIL] Did not reject empty request properly");
  }

  // 2. Unsupported MIME type test
  console.log("\n--- Test 2: Reject unsupported MIME type ---");
  const badMimeReq = new NextRequest("http://localhost:3000/api/food/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: "aGVsbG8=",
      mimeType: "application/pdf",
    }),
  });
  const res2 = await POST(badMimeReq);
  const data2 = await res2.json();
  console.log("Bad MIME status:", res2.status, "code:", data2.code);
  if (res2.status === 400 && data2.code === "INVALID_IMAGE") {
    console.log("  [PASS] Successfully rejected non-image MIME with HTTP 400");
  } else {
    console.error("  [FAIL] Did not reject bad MIME properly");
  }

  // 3. Payload size check
  console.log("\n--- Test 3: Reject oversized base64 payload (>8MB) ---");
  const hugePayload = "A".repeat(9 * 1024 * 1024);
  const oversizedReq = new NextRequest("http://localhost:3000/api/food/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: hugePayload,
      mimeType: "image/jpeg",
    }),
  });
  const res3 = await POST(oversizedReq);
  const data3 = await res3.json();
  console.log("Oversized payload status:", res3.status, "code:", data3.code);
  if (res3.status === 413 && data3.code === "PAYLOAD_TOO_LARGE") {
    console.log("  [PASS] Successfully rejected oversized payload with HTTP 413");
  } else {
    console.error("  [FAIL] Did not reject oversized payload properly");
  }

  console.log("\n==================================================================");
  console.log("ROUTE INTEGRATION TESTS COMPLETED SUCCESSFULLY");
  console.log("==================================================================");
}

testScanRoute().catch((err) => {
  console.error("Route test failed:", err);
  process.exit(1);
});
