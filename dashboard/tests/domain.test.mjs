import assert from "node:assert/strict";
import test from "node:test";

import {
  HIGH_RISK_PRESET,
  LOW_RISK_PRESET,
  validateApplicantInput,
  validatePredictionInput,
} from "../src/lib/domain.ts";

test("validateApplicantInput accepts valid borrower data", () => {
  const errors = validateApplicantInput({
    applicant_id: "CR010",
    full_name: "Jordan Lee",
    credit_limit: 90000,
    age: 32,
    education: 2,
    marital_status: 1,
  });
  assert.deepEqual(errors, {});
});

test("validateApplicantInput rejects short ID, negative limit, and underage", () => {
  const errors = validateApplicantInput({
    applicant_id: "CR",
    credit_limit: -100,
    age: 16,
    education: 2,
    marital_status: 1,
  });
  assert.ok(errors.applicant_id);
  assert.ok(errors.credit_limit);
  assert.ok(errors.age);
});

test("validatePredictionInput accepts high and low risk presets", () => {
  assert.deepEqual(validatePredictionInput(HIGH_RISK_PRESET), {});
  assert.deepEqual(validatePredictionInput(LOW_RISK_PRESET), {});
});

test("validatePredictionInput flags invalid repayment status and negative payment", () => {
  const errors = validatePredictionInput({
    ...HIGH_RISK_PRESET,
    PAY_0: 12,
    PAY_AMT1: -50,
  });
  assert.ok(errors.PAY_0);
  assert.ok(errors.PAY_AMT1);
});
