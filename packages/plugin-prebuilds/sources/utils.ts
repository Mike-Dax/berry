import {Cache, structUtils, Locator, Descriptor, Ident, Project, ThrowReport, miscUtils, FetchOptions, Package} from '@yarnpkg/core';
import {npath, PortablePath, xfs, ppath, Filename, NodeFS}                                                      from '@yarnpkg/fslib';

export const getElectronVersion = async (project:Project) => {
  for (const pkg of project.storedPackages.values()) {
    if (pkg.name === 'electron') {
      return pkg.version
    }
  }

  return null
}

export const getNativeModuleVersion = async (project:Project, packageIdent: Ident, ident: Ident) => {
  // we need to find the package that matches packageIdent which has a dependency on our ephemeral bindings package
  for (const pkg of project.storedPackages.values()) {
    // see if it matches packageIdent
    if (pkg.name === packageIdent.name && pkg.scope === packageIdent.scope) {
      //for (const [identHash, dependency] of pkg.dependencies) {
      //  if (dependency.name === "bindings") {
          return pkg.version
      //  }
      //}
    }
  }

  return null
}

export function parseSpec(spec: string) {
  const payload = spec.substring(spec.indexOf("builtin<prebuild/") + 17, spec.length - 1);
  const packageIdent = structUtils.parseIdent(payload)
  return { packageIdent };
}

/*
export function makeDescriptor(ident: Ident, {parentLocator, sourceDescriptor, patchPaths}: ReturnType<typeof parseDescriptor>) {
  return structUtils.makeLocator(ident, makeSpec({parentLocator, sourceItem: sourceDescriptor, patchPaths}, structUtils.stringifyDescriptor));
}



type VisitPatchPathOptions<T> = {
  onAbsolute: (p: PortablePath) => T,
  onRelative: (p: PortablePath) => T,
  onBuiltin: (name: string) => T,
};

function visitPatchPath<T>({onAbsolute, onRelative, onBuiltin}: VisitPatchPathOptions<T>, patchPath: PortablePath) {
  const builtinMatch = patchPath.match(BUILTIN_REGEXP);
  if (builtinMatch !== null)
    return onBuiltin(builtinMatch[1]);

  if (ppath.isAbsolute(patchPath)) {
    return onAbsolute(patchPath);
  } else {
    return onRelative(patchPath);
  }
}

export function isParentRequired(patchPath: PortablePath) {
  return visitPatchPath({
    onAbsolute: () => false,
    onRelative: () => true,
    onBuiltin: () => false,
  }, patchPath);
}

export async function loadPatchFiles(parentLocator: Locator | null, patchPaths: Array<PortablePath>, opts: FetchOptions) {
  // When the patch files use absolute paths we can directly access them via
  // their location on the disk. Otherwise we must go through the package fs.
  const parentFetch = parentLocator !== null
    ? await opts.fetcher.fetch(parentLocator, opts)
    : null;

  // If the package fs publicized its "original location" (for example like
  // in the case of "file:" packages), we use it to derive the real location.
  const effectiveParentFetch = parentFetch && parentFetch.localPath
    ? {packageFs: new NodeFS(), prefixPath: parentFetch.localPath, releaseFs: undefined}
    : parentFetch;

  // Discard the parent fs unless we really need it to access the files
  if (parentFetch && parentFetch !== effectiveParentFetch && parentFetch.releaseFs)
    parentFetch.releaseFs();

  // First we obtain the specification for all the patches that we'll have to
  // apply to the original package.
  return await miscUtils.releaseAfterUseAsync(async () => {
    return await Promise.all(patchPaths.map(async patchPath => visitPatchPath({
      onAbsolute: async () => {
        return await xfs.readFilePromise(patchPath, `utf8`);
      },

      onRelative: async () => {
        if (parentFetch === null)
          throw new Error(`Assertion failed: The parent locator should have been fetched`);

        return await parentFetch.packageFs.readFilePromise(patchPath, `utf8`);
      },

      onBuiltin: async name => {
        return await opts.project.configuration.firstHook((hooks: PatchHooks) => {
          return hooks.getBuiltinPatch;
        }, opts.project, name);
      },
    }, patchPath)));
  });
}

export async function extractPackageToDisk(locator: Locator, {cache, project}: {cache: Cache, project: Project}) {
  const checksums = project.storedChecksums;
  const report = new ThrowReport();

  const fetcher = project.configuration.makeFetcher();
  const fetchResult = await fetcher.fetch(locator, {cache, project, fetcher, checksums, report});

  const temp = await xfs.mktempPromise();
  await xfs.copyPromise(temp, fetchResult.prefixPath, {
    baseFs: fetchResult.packageFs,
  });

  await xfs.writeJsonPromise(ppath.join(temp, `.yarn-patch.json` as Filename), {
    locator: structUtils.stringifyLocator(locator),
  });

  return temp;
}
*/
