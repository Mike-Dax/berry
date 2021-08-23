import {structUtils}                                from "@yarnpkg/core";

import {VariantMatrix, VariantParameters, Variants} from "./Manifest";
import {Descriptor, Ident, Locator}                 from "./types";


export function combineVariantMatrix(variantMatrix: VariantMatrix, exclusions: Array<VariantParameters> = [], keyIndex = 0, combinations: Array<VariantParameters> = [], stack: VariantParameters = {}) {
  const keys = Object.keys(variantMatrix);

  // If there's no matrix, there's no combinations
  if (keys.length === 0)
    return [];

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
    const candidates = variantMatrix[key];

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

/**
 * Given a list of possible parameters, and the current parameters value, match them and return those ones that match
 */
export function matchVariantParameters(possibilities: Array<VariantParameters>, parameters: VariantParameters, comparators: VariantParameterComparators = {}) {
  const matches: Array<VariantParameters> = [];

  possibilityLoop: for (const possibility of possibilities) {
    for (const key of Object.keys(possibility)) {
      const comparator = comparators[key] ? comparators[key] : defaultParameterComparator;

      if (!comparator(parameters[key], possibility[key])) {
        // If this key doesn't match, skip this possibility
        continue possibilityLoop;
      }
    }

    // If all keys match, return this possiblity
    matches.push(possibility);
  }

  return matches;
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

  return structUtils.parseDescriptor(patternToReplace);
}

// A deep equality
export function compareVariantConfiguration(variantsA: Array<Variants> | null, variantsB: Array<Variants> | null) {
  // TODO: actually compare
  return false;
}
