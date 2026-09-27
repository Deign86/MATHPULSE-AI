import { readFileSync } from "node:fs";

const mode = process.argv[2];
const mainPy = readFileSync("backend/main.py", "utf8");

if (mode === "backend-validation") {
  const hasUpperCheck = mainPy.includes('re.search(r"[A-Z]", temporary_password)');
  const hasLowerCheck = mainPy.includes('re.search(r"[a-z]", temporary_password)');
  const hasDigitCheck = mainPy.includes('re.search(r"\\d", temporary_password)');
  const hasSpecialCheck = mainPy.includes('re.search(r"[^A-Za-z0-9]", temporary_password)');
  const hasSpecialInGen = mainPy.includes('special_characters = "!@#$%&*"');

  if (hasUpperCheck && hasLowerCheck && hasDigitCheck && hasSpecialCheck && hasSpecialInGen) {
    console.log("PASS: backend password validation");
    process.exit(0);
  } else {
    console.error("FAIL: backend password validation missing checks");
    process.exit(1);
  }
}

if (mode === "error-mapping") {
  const hasPasswordPolicyHandling = mainPy.includes("password_does_not_meet_requirements") &&
    mainPy.includes('detail="Password does not meet authentication policy requirements');
  const hasInvalidEmailHandling = mainPy.includes("invalid_email") &&
    mainPy.includes('detail="The email address is improperly formatted or not accepted."');

  if (hasPasswordPolicyHandling && hasInvalidEmailHandling) {
    console.log("PASS: error mapping");
    process.exit(0);
  } else {
    console.error("FAIL: error mapping missing checks");
    process.exit(1);
  }
}

console.error("Unknown mode: " + mode);
process.exit(1);
