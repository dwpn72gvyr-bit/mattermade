// packages/policy — THE permission engine (R6: centralised, field-level
// permissions; R5: time sovereignty; R7: the non-surveillance boundary).
// Pure TypeScript: no I/O, no framework, no system clock (pass asOf).
// Implements master prompt §7: sensitivity classes, role capabilities,
// the can() engine, aggregation floors and the policy serialiser.

export * from './roles';
export * from './sensitivity';
export * from './can';
export * from './masking';
