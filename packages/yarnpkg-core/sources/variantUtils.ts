import {structUtils}                                from "@yarnpkg/core";

import {VariantMatrix, VariantParameters, Variants} from "./Manifest";
import {Descriptor, Locator}                        from "./types";


export function combineVariantMatrix(variantMatrix: VariantMatrix, exclusions: Array<VariantParameters>, keys: Array<string>, keyIndex = 0, combinations: Array<VariantParameters> = [], stack: VariantParameters = {}) {
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
      combineVariantMatrix(variantMatrix, exclusions, keys, keyIndex + 1, combinations, {
        ...stack,
        [key]: candidate,
      });
    }
  }

  return combinations;
}

export function matchVariantParameters(possibilities: Array<VariantParameters>, parameters: VariantParameters) {
  const parameterKeys = Object.keys(parameters);

  possibilityLoop: for (const possibility of possibilities) {
    for (const key of parameterKeys) {
      if (possibility[key] !== parameters[key]) {
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

export function matchVariants(locator: Locator, variants: Variants, variantParameters: VariantParameters): Descriptor | null {
  const matrix = variants.matrix;
  // If this is a fallback, return immediately
  if (!matrix)
    return structUtils.parseDescriptor(variants.pattern);

  // Collect all the parameter keys
  const parameterKeys = Object.keys(matrix ?? {});

  // Build the combinations from the possibilities

  const possibilities = combineVariantMatrix(matrix, variants.exclude ?? [], parameterKeys);

  // For every possibility, check if the current variant parameters match
  const match = matchVariantParameters(possibilities, variantParameters);

  if (match) {
    const replacementDescriptorString = templateVariantPattern(variants.pattern, variantParameters);

    const ident = structUtils.parseIdent(replacementDescriptorString);
    const descriptor = structUtils.convertLocatorToDescriptor(locator);

    // Return the replaced ident with the range of the locator
    return structUtils.makeDescriptor(ident, descriptor.range);
  }

  return null;
}
