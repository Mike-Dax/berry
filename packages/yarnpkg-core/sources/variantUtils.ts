import {structUtils}                                from "@yarnpkg/core";

import {VariantMatrix, VariantParameters, Variants} from "./Manifest";
import {Ident, Locator}                             from "./types";


export function combineVariantMatrix(variantMatrix: VariantMatrix, exclusions: Array<VariantParameters> = [], keyIndex = 0, combinations: Array<VariantParameters> = [], stack: VariantParameters = {}) {
  const keys = Object.keys(variantMatrix ?? {});

  if (keyIndex === keys.length) {
    // Check if this matches an exclusion record
    let include = true;

    exclusionLoop: for (const exclusion of exclusions) {
      let matchExclusion = true;
      exclusionKeyLoop: for (const key of Object.keys(exclusion)) {
        // Check if this key of this exclusion criteria matches the parameters we're about to add
        if (exclusion[key] !== stack[key]) {
          matchExclusion = false;
          break exclusionKeyLoop;
        }
      }
      if (matchExclusion) {
        include = false;
        break exclusionLoop;
      }
    }

    if (include) {
      combinations.push(stack);
    }
  } else {
    const key = keys[keyIndex];
    const candidates = variantMatrix[key].candidates;

    for (const candidate of candidates) {
      combineVariantMatrix(variantMatrix, exclusions, keyIndex + 1, combinations, {
        ...stack,
        [key]: candidate,
      });
    }
  }

  return combinations;
}

/**
 * Custom functions to determine if parameters are compatible
 */
export interface VariantParameterComparators {
  [parameterKey: string]: (parameterValue: string, possibilityValue: string) => boolean
}

const defaultParameterComparator = (parameterValue: string, possibilityValue: string) => parameterValue === possibilityValue;

export function matchVariantParameters(possibilities: Array<VariantParameters>, parameters: VariantParameters, comparators: VariantParameterComparators = {}) {
  possibilityLoop: for (const possibility of possibilities) {
    for (const key of Object.keys(possibility)) {
      const comparator = comparators[key] ? comparators[key] : defaultParameterComparator;

      if (!comparator(parameters[key], possibility[key])) {
        // If this key doesn't match, skip this possibility
        continue possibilityLoop;
      }
    }

    // If all keys match, return this possiblity
    return possibility;
  }

  // None matched
  return null;
}

export function templateVariantPattern(pattern: string, parameters: VariantParameters) {
  // Parse our pattern, for every parameterKey we have, see if we can replace something
  let patternToReplace = pattern;

  for (const parameterKey of Object.keys(parameters)) {
    const keyWithPercent = `%${parameterKey}`;
    const value = parameters[parameterKey];

    // Replace every instance of the key with the value
    while (patternToReplace.indexOf(keyWithPercent) > 0) {
      patternToReplace = patternToReplace.replace(keyWithPercent, value);
    }
  }

  return patternToReplace;
}

export function matchVariants(variants: Variants, variantParameters: VariantParameters, variantParameterComparators: VariantParameterComparators): Ident | null {
  const matrix = variants.matrix;
  // If this is a fallback, return immediately
  if (!matrix) {
    if (variants.pattern.includes(`%`))
      throw new Error(`Assertion failed: Variant patterns can't contain templating if no matrix exists`);

    return structUtils.parseIdent(variants.pattern);
  }

  // Build the combinations from the possibilities
  const possibilities = combineVariantMatrix(matrix, variants.exclude);

  // For every possibility, check if the current variant parameters match
  const match = matchVariantParameters(possibilities, variantParameters, variantParameterComparators);

  if (match) {
    const replacementDescriptorString = templateVariantPattern(variants.pattern, variantParameters);

    // Return the replaced ident with the range of the locator
    return structUtils.parseIdent(replacementDescriptorString);
  }

  return null;
}

export function replaceVariantLocator(locator: Locator, replacement: Ident) {
  return structUtils.makeLocator(replacement, locator.reference);
}

/**
 * Packages can set variantParameters for their descendents
 *
 * "variantParameters": {
 *   "platform": "wasm"
 * },
 *
 * Packages can provide variants that will be resolved
 *
 * "variants": [
 *   {
 *     "pattern": "prisma-build-%platform-%napi",
 *     "matrix": {
 *       "platform": {
 *         "candidates": [
 *           "darwin",
 *           "win32"
 *         ]
 *       },
 *       "napi": {
 *         "candidates": [
 *           "5",
 *           "6"
 *         ]
 *       }
 *     },
 *     "exclude": [
 *       {
 *         "platform": "win32",
 *         "napi": 5
 *       }
 *     ]
 *   },
 *   {
 *     "pattern": "prisma-build-%platform",
 *     "matrix": {
 *       "platform": {
 *         "candidates": [
 *           "wasm"
 *         ]
 *       }
 *     }
 *   },
 *   {
 *     "pattern": "prisma-build-sources"
 *   }
 * ]
 */
