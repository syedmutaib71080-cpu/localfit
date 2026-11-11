import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local manually if not in process.env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = (match[2] || "").trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

interface TestResult {
  scenario: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL" | "INCONCLUSIVE";
  details?: string;
}

const results: TestResult[] = [];

async function runRlsTests() {
  console.log("==================================================================");
  console.log("LOCALFIT STAGE 7 — AUTHENTICATED RLS DML TEST SUITE");
  console.log("==================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("FATAL: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing.");
    process.exit(1);
  }

  const userAEmail = process.env.TEST_USER_A_EMAIL;
  const userAPassword = process.env.TEST_USER_A_PASSWORD;
  const userBEmail = process.env.TEST_USER_B_EMAIL;
  const userBPassword = process.env.TEST_USER_B_PASSWORD;

  if (!userAEmail || !userAPassword || !userBEmail || !userBPassword) {
    console.log("CREDENTIALS STATUS: INCOMPLETE");
    console.log("Required environment variables in .env.local:");
    console.log(`  TEST_USER_A_EMAIL:    ${userAEmail ? "[CONFIGURED]" : "[MISSING]"}`);
    console.log(`  TEST_USER_A_PASSWORD: ${userAPassword ? "[CONFIGURED]" : "[MISSING]"}`);
    console.log(`  TEST_USER_B_EMAIL:    ${userBEmail ? "[CONFIGURED]" : "[MISSING]"}`);
    console.log(`  TEST_USER_B_PASSWORD: ${userBPassword ? "[CONFIGURED]" : "[MISSING]"}`);
    console.log("\nRLS DML tests cannot execute without authenticated sessions for both User A and User B.");
    return { status: "CREDENTIALS_MISSING" };
  }

  // Create isolated clients using anon key only
  const clientA = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("1. Authenticating User A and User B via supabase.auth.signInWithPassword()...");

  const { data: authA, error: errorA } = await clientA.auth.signInWithPassword({
    email: userAEmail,
    password: userAPassword,
  });

  if (errorA || !authA.user) {
    console.error(`  [FAIL] User A (${userAEmail}): HTTP ${errorA?.status || "ERR"} - ${errorA?.message}`);
    results.push({
      scenario: "Authenticate User A",
      expected: "Successful authentication",
      actual: `Failed: ${errorA?.message || "Unknown error"}`,
      status: "FAIL",
    });
  } else {
    console.log(`  [OK] User A (${userAEmail}) authenticated (ID: ${authA.user.id})`);
    results.push({
      scenario: "Authenticate User A",
      expected: "Successful authentication",
      actual: `Authenticated (ID: ${authA.user.id})`,
      status: "PASS",
    });
  }

  const { data: authB, error: errorB } = await clientB.auth.signInWithPassword({
    email: userBEmail,
    password: userBPassword,
  });

  if (errorB || !authB.user) {
    console.error(`  [FAIL] User B (${userBEmail}): HTTP ${errorB?.status || "ERR"} - ${errorB?.message}`);
    results.push({
      scenario: "Authenticate User B",
      expected: "Successful authentication",
      actual: `Failed: ${errorB?.message || "Unknown error"}`,
      status: "FAIL",
    });
  } else {
    console.log(`  [OK] User B (${userBEmail}) authenticated (ID: ${authB.user.id})`);
    results.push({
      scenario: "Authenticate User B",
      expected: "Successful authentication",
      actual: `Authenticated (ID: ${authB.user.id})`,
      status: "PASS",
    });
  }

  if (!authA?.user || !authB?.user) {
    console.log("\nCannot proceed with DML RLS matrix until both users authenticate successfully.");
    console.log("\n==================================================================");
    console.log("AUTHENTICATED RLS DML TEST RESULTS");
    console.log("==================================================================");
    console.table(results);
    return { status: "AUTH_FAILED", results };
  }

  let testSubmissionId: string | null = null;

  try {
    // TEST 1: User A inserts a pending recipe submission
    console.log("--- Test 1: User A Inserts Pending Recipe Submission ---");
    const { data: insertedData, error: insertError } = await clientA
      .from("recipe_submissions")
      .insert({
        user_id: authA.user.id,
        dish_name: "Audit Test Haldi Paan Pathrode",
        local_name: "Haldi Paan Pathrode",
        region: "Bhatkal",
        locality: "Navayath",
        cuisine: "Bhatkal cuisine",
        category: "Vegetarian",
        ingredients_text: "Turmeric leaves, rice batter, jaggery, coconut",
        cooking_instructions: "Steam in turmeric leaves for 25 minutes",
        serving_count: 4,
        source_attribution: "Traditional family recipe for RLS audit",
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      results.push({
        scenario: "User A insert own pending submission",
        expected: "Insert succeeds (row created)",
        actual: `Error ${insertError.code}: ${insertError.message}`,
        status: "FAIL",
      });
      console.error(`  [FAIL] Insert failed: ${insertError.message}`);
    } else {
      testSubmissionId = insertedData.id;
      results.push({
        scenario: "User A insert own pending submission",
        expected: "Insert succeeds (status: pending)",
        actual: `Row created (ID: ${testSubmissionId}, status: ${insertedData.status})`,
        status: "PASS",
      });
      console.log(`  [PASS] Inserted submission ${testSubmissionId} with status 'pending'`);
    }

    // TEST 2: User A reads own submission
    console.log("\n--- Test 2: User A Reads Own Submission ---");
    if (testSubmissionId) {
      const { data: readAData, error: readAError } = await clientA
        .from("recipe_submissions")
        .select("id, dish_name, status, user_id")
        .eq("id", testSubmissionId);

      if (readAError || !readAData || readAData.length === 0) {
        results.push({
          scenario: "User A read own submission",
          expected: "Returns 1 row",
          actual: readAError ? `Error: ${readAError.message}` : "0 rows returned",
          status: "FAIL",
        });
        console.error("  [FAIL] User A could not read own submission");
      } else {
        results.push({
          scenario: "User A read own submission",
          expected: "Returns 1 row",
          actual: `Retrieved ${readAData.length} row (dish: ${readAData[0].dish_name})`,
          status: "PASS",
        });
        console.log(`  [PASS] User A read own submission: ${readAData[0].dish_name}`);
      }
    }

    // TEST 3: User A updates own pending submission
    console.log("\n--- Test 3: User A Updates Own Pending Submission ---");
    if (testSubmissionId) {
      const { data: updateAData, error: updateAError } = await clientA
        .from("recipe_submissions")
        .update({
          ingredients_text: "Turmeric leaves, soaked rice batter, fresh jaggery, grated coconut",
        })
        .eq("id", testSubmissionId)
        .select();

      if (updateAError || !updateAData || updateAData.length === 0) {
        results.push({
          scenario: "User A update own pending submission",
          expected: "Update succeeds (1 row modified)",
          actual: updateAError ? `Error: ${updateAError.message}` : "0 rows affected",
          status: "FAIL",
        });
        console.error("  [FAIL] User A update failed");
      } else {
        results.push({
          scenario: "User A update own pending submission",
          expected: "Update succeeds (1 row modified)",
          actual: `1 row modified successfully`,
          status: "PASS",
        });
        console.log("  [PASS] User A updated own pending submission ingredients");
      }
    }

    // TEST 4: User B cannot read User A's submission
    console.log("\n--- Test 4: User B Cross-Account Read Isolation ---");
    if (testSubmissionId) {
      const { data: readBData, error: readBError } = await clientB
        .from("recipe_submissions")
        .select("id, dish_name, status")
        .eq("id", testSubmissionId);

      if (readBError) {
        results.push({
          scenario: "User B cannot read User A submission",
          expected: "0 rows returned (RLS filtered)",
          actual: `API Error: ${readBError.message}`,
          status: "FAIL",
        });
        console.error(`  [FAIL] Read error: ${readBError.message}`);
      } else if (readBData && readBData.length > 0) {
        results.push({
          scenario: "User B cannot read User A submission",
          expected: "0 rows returned (RLS filtered)",
          actual: `LEAK: User B received ${readBData.length} row(s)`,
          status: "FAIL",
        });
        console.error("  [CRITICAL FAIL] User B read User A's private pending submission!");
      } else {
        results.push({
          scenario: "User B cannot read User A submission",
          expected: "0 rows returned (RLS filtered)",
          actual: "0 rows returned (RLS filtered)",
          status: "PASS",
        });
        console.log("  [PASS] User B received 0 rows when querying User A's submission");
      }
    }

    // TEST 5: User B cannot update User A's submission
    console.log("\n--- Test 5: User B Cross-Account Update Isolation ---");
    if (testSubmissionId) {
      const { data: updateBData, error: updateBError } = await clientB
        .from("recipe_submissions")
        .update({
          dish_name: "HACKED BY USER B",
        })
        .eq("id", testSubmissionId)
        .select();

      if (updateBData && updateBData.length > 0) {
        results.push({
          scenario: "User B cannot update User A submission",
          expected: "0 rows updated",
          actual: `BREACH: ${updateBData.length} row(s) updated`,
          status: "FAIL",
        });
        console.error("  [CRITICAL FAIL] User B modified User A's submission!");
      } else {
        results.push({
          scenario: "User B cannot update User A submission",
          expected: "0 rows updated",
          actual: `0 rows modified (${updateBError ? `Error: ${updateBError.message}` : "silent RLS filter"})`,
          status: "PASS",
        });
        console.log("  [PASS] User B update blocked: 0 rows modified");
      }
    }

    // TEST 6: User B cannot delete User A's submission
    console.log("\n--- Test 6: User B Cross-Account Delete Isolation ---");
    if (testSubmissionId) {
      const { data: deleteBData, error: deleteBError } = await clientB
        .from("recipe_submissions")
        .delete()
        .eq("id", testSubmissionId)
        .select();

      if (deleteBData && deleteBData.length > 0) {
        results.push({
          scenario: "User B cannot delete User A submission",
          expected: "0 rows deleted",
          actual: `BREACH: ${deleteBData.length} row(s) deleted`,
          status: "FAIL",
        });
        console.error("  [CRITICAL FAIL] User B deleted User A's submission!");
      } else {
        results.push({
          scenario: "User B cannot delete User A submission",
          expected: "0 rows deleted",
          actual: `0 rows deleted (${deleteBError ? `Error: ${deleteBError.message}` : "silent RLS filter"})`,
          status: "PASS",
        });
        console.log("  [PASS] User B delete blocked: 0 rows affected");
      }
    }

    // TEST 7: User A cannot self-approve submission
    console.log("\n--- Test 7: User A Self-Approval Rejection ---");
    if (testSubmissionId) {
      const { data: approveData, error: approveError } = await clientA
        .from("recipe_submissions")
        .update({
          status: "approved",
        })
        .eq("id", testSubmissionId)
        .select();

      if (approveError) {
        results.push({
          scenario: "User A cannot change status to approved",
          expected: "Rejected by RLS WITH CHECK (code 42501)",
          actual: `Rejected: HTTP ${approveError.code || "ERR"} - ${approveError.message}`,
          status: "PASS",
        });
        console.log(`  [PASS] Self-approval rejected: ${approveError.message}`);
      } else if (approveData && approveData.length > 0 && approveData[0].status === "approved") {
        results.push({
          scenario: "User A cannot change status to approved",
          expected: "Rejected by RLS WITH CHECK",
          actual: "VULNERABILITY: Status changed to 'approved'",
          status: "FAIL",
        });
        console.error("  [CRITICAL FAIL] User A successfully approved their own submission!");
      } else {
        results.push({
          scenario: "User A cannot change status to approved",
          expected: "Rejected or 0 rows modified",
          actual: "0 rows modified (RLS WITH CHECK prevented status change)",
          status: "PASS",
        });
        console.log("  [PASS] Status remains pending (0 rows modified)");
      }
    }

    // TEST 8: User A deletes own pending submission (cleanup)
    console.log("\n--- Test 8: User A Deletes Own Pending Submission ---");
    if (testSubmissionId) {
      const { data: deleteAData, error: deleteAError } = await clientA
        .from("recipe_submissions")
        .delete()
        .eq("id", testSubmissionId)
        .select();

      if (deleteAError || !deleteAData || deleteAData.length === 0) {
        results.push({
          scenario: "User A delete own pending submission",
          expected: "1 row deleted",
          actual: deleteAError ? `Error: ${deleteAError.message}` : "0 rows deleted",
          status: "FAIL",
        });
        console.error("  [FAIL] User A could not delete own pending submission");
      } else {
        testSubmissionId = null; // Cleaned up
        results.push({
          scenario: "User A delete own pending submission",
          expected: "1 row deleted",
          actual: "1 row deleted successfully",
          status: "PASS",
        });
        console.log("  [PASS] User A deleted own pending submission");
      }
    }
  } finally {
    // Emergency cleanup if test failed before deleting
    if (testSubmissionId) {
      console.log("\nExecuting emergency cleanup of test submission...");
      await clientA.from("recipe_submissions").delete().eq("id", testSubmissionId);
    }
  }

  // Print final summary table
  console.log("\n==================================================================");
  console.log("FINAL AUTHENTICATED RLS DML TEST RESULTS");
  console.log("==================================================================");
  console.table(results);

  return { status: "COMPLETED", results };
}

runRlsTests().catch((err) => {
  console.error("Unexpected test failure:", err);
  process.exit(1);
});
