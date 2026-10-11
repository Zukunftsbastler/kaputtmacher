// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Minimal declarative validator for untrusted JSON-like data (scores, recipes,
 * manifests). It collects all issues instead of stopping at the first one and
 * rejects prototype-polluting keys.
 */

/**
 * @typedef {object} Issue
 * @property {string} path  JSON-path-like location, e.g. "$.tracks[0].events[3].p"
 * @property {string} message
 */

/**
 * @typedef {{ type: 'any' }} AnySchema
 * @typedef {{ type: 'boolean' }} BooleanSchema
 * @typedef {{ type: 'number', min?: number, max?: number, exclusiveMin?: number, integer?: boolean }} NumberSchema
 * @typedef {{ type: 'string', enum?: readonly string[], pattern?: RegExp, minLength?: number, maxLength?: number }} StringSchema
 * @typedef {{ type: 'array', items: Schema, minItems?: number, maxItems?: number }} ArraySchema
 * @typedef {{ type: 'object', properties?: Record<string, Schema>, required?: readonly string[], additional?: boolean | Schema }} ObjectSchema
 * @typedef {(AnySchema | BooleanSchema | NumberSchema | StringSchema | ArraySchema | ObjectSchema) & { check?: (value: any, path: string) => Issue[] | void }} Schema
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Validates a value against a schema.
 * @param {unknown} value
 * @param {Schema} schema
 * @param {string} [path]
 * @returns {Issue[]} empty when valid
 */
export function validate(value, schema, path = '$') {
  /** @type {Issue[]} */
  const issues = [];
  validateInto(value, schema, path, issues);
  return issues;
}

/**
 * @param {unknown} value
 * @param {Schema} schema
 * @param {string} path
 * @param {Issue[]} issues
 */
function validateInto(value, schema, path, issues) {
  const before = issues.length;
  switch (schema.type) {
    case 'any':
      break;
    case 'boolean':
      if (typeof value !== 'boolean') issues.push({ path, message: 'expected boolean' });
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        issues.push({ path, message: 'expected finite number' });
      } else {
        if (schema.integer && !Number.isInteger(value)) issues.push({ path, message: 'expected integer' });
        if (schema.min !== undefined && value < schema.min) issues.push({ path, message: `must be >= ${schema.min}` });
        if (schema.max !== undefined && value > schema.max) issues.push({ path, message: `must be <= ${schema.max}` });
        if (schema.exclusiveMin !== undefined && value <= schema.exclusiveMin) {
          issues.push({ path, message: `must be > ${schema.exclusiveMin}` });
        }
      }
      break;
    case 'string':
      if (typeof value !== 'string') {
        issues.push({ path, message: 'expected string' });
      } else {
        if (schema.enum && !schema.enum.includes(value)) {
          issues.push({ path, message: `must be one of: ${schema.enum.join(', ')}` });
        }
        if (schema.pattern && !schema.pattern.test(value)) issues.push({ path, message: `does not match ${schema.pattern}` });
        if (schema.minLength !== undefined && value.length < schema.minLength) {
          issues.push({ path, message: `must have length >= ${schema.minLength}` });
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
          issues.push({ path, message: `must have length <= ${schema.maxLength}` });
        }
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        issues.push({ path, message: 'expected array' });
      } else {
        if (schema.minItems !== undefined && value.length < schema.minItems) {
          issues.push({ path, message: `must have >= ${schema.minItems} items` });
        }
        if (schema.maxItems !== undefined && value.length > schema.maxItems) {
          issues.push({ path, message: `must have <= ${schema.maxItems} items` });
          break; // do not walk oversized input
        }
        for (let i = 0; i < value.length; i++) validateInto(value[i], schema.items, `${path}[${i}]`, issues);
      }
      break;
    case 'object': {
      if (!isPlainObject(value)) {
        issues.push({ path, message: 'expected plain object' });
        break;
      }
      const props = schema.properties ?? {};
      for (const key of schema.required ?? []) {
        if (!Object.hasOwn(value, key)) issues.push({ path: `${path}.${key}`, message: 'is required' });
      }
      for (const key of Object.keys(value)) {
        const childPath = `${path}.${key}`;
        if (FORBIDDEN_KEYS.has(key)) {
          issues.push({ path: childPath, message: 'forbidden key' });
          continue;
        }
        if (Object.hasOwn(props, key)) {
          validateInto(value[key], props[key], childPath, issues);
        } else if (schema.additional === undefined || schema.additional === false) {
          issues.push({ path: childPath, message: 'unknown property' });
        } else if (schema.additional !== true) {
          validateInto(value[key], schema.additional, childPath, issues);
        }
      }
      break;
    }
    default:
      issues.push({ path, message: 'invalid schema' });
  }
  // Custom checks run only on structurally valid values.
  if (schema.check && issues.length === before) {
    const extra = schema.check(value, path);
    if (extra) issues.push(...extra);
  }
}

/** Thrown by assertValid; carries the full issue list. */
export class ValidationError extends Error {
  /**
   * @param {string} label
   * @param {Issue[]} issues
   */
  constructor(label, issues) {
    const shown = issues.slice(0, 10).map((i) => `  ${i.path}: ${i.message}`).join('\n');
    const more = issues.length > 10 ? `\n  … ${issues.length - 10} more` : '';
    super(`Invalid ${label}:\n${shown}${more}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/**
 * @param {unknown} value
 * @param {Schema} schema
 * @param {string} label used in the error message
 */
export function assertValid(value, schema, label) {
  const issues = validate(value, schema);
  if (issues.length > 0) throw new ValidationError(label, issues);
}
