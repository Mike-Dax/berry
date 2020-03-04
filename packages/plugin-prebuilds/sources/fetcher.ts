import {Fetcher, FetchOptions, MinimalFetchOptions} from '@yarnpkg/core';
import {Locator, MessageName}                       from '@yarnpkg/core';
import {miscUtils, structUtils}                     from '@yarnpkg/core';
import {ppath, xfs, ZipFS, Filename, CwdFS}         from '@yarnpkg/fslib';
import {getLibzipPromise}                           from '@yarnpkg/libzip';

import * as utils                              from './utils';

export class PrebuildFetcher implements Fetcher {
  supports(locator: Locator, opts: MinimalFetchOptions) {
    if (!locator.reference.startsWith(`prebuild:`))
      return false;

    return true;
  }

  getLocalPath(locator: Locator, opts: FetchOptions) {
    return null;
  }

  async fetch(locator: Locator, opts: FetchOptions) {
    const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;

    const [packageFs, releaseFs, checksum] = await opts.cache.fetchPackageFromCache(
      locator,
      expectedChecksum,
      async () => {
        opts.report.reportInfoOnce(MessageName.FETCH_NOT_CACHED, `${structUtils.prettyLocator(opts.project.configuration, locator)} can't be found in the cache and will be fetched from the registry`);
        return await this.fetchPrebuild(locator, opts);
      },
    );

    return {
      packageFs,
      releaseFs,
      prefixPath: structUtils.getIdentVendorPath(locator),
      localPath: this.getLocalPath(locator, opts),
      checksum,
    };
  }

  private async fetchPrebuild(locator: Locator, opts: FetchOptions) {
    const { packageIdent } = utils.parseSpec(locator.reference);

    opts.report.reportInfo(MessageName.UNNAMED, `Fetching prebuilt for ${packageIdent.name}`)

    const electronVersion = await utils.getElectronVersion(opts.project)

    // opts.report.reportInfo(MessageName.UNNAMED, `Found electron version ${electronVersion}`)

    const nativeModuleVersion = await utils.getNativeModuleVersion(opts.project, packageIdent, locator)

    // opts.report.reportInfo(MessageName.UNNAMED, `Found ${structUtils.stringifyIdent(packageIdent)} version ${nativeModuleVersion}`)

    opts.report.reportInfo(MessageName.UNNAMED, `Fetching prebuild for ${structUtils.stringifyIdent(packageIdent)} version ${nativeModuleVersion} on runtime electron version ${electronVersion}`)

    const tmpDir = await xfs.mktempPromise();
    const tmpFile = ppath.join(tmpDir, `patched.zip` as Filename);

    //const sourceFetch = await opts.fetcher.fetch(sourceLocator, opts);
    const prefixPath = structUtils.getIdentVendorPath(locator);

    const libzip = await getLibzipPromise();

    const copiedPackage = new ZipFS(tmpFile, {libzip, create: true});
    await copiedPackage.mkdirpPromise(prefixPath);

    // await miscUtils.releaseAfterUseAsync(async () => {
    //   await copiedPackage.copyPromise(prefixPath, sourceFetch.prefixPath, {baseFs: sourceFetch.packageFs});
    // }, sourceFetch.releaseFs);

    copiedPackage.saveAndClose();

    const generatedPackage = new ZipFS(tmpFile, {libzip});
    const patchFs = new CwdFS(prefixPath, {baseFs: generatedPackage});

    // for (const patchFile of patchFiles) {
    //   if (patchFile !== null) {
    //     await patchUtils.applyPatchFile(patchUtils.parsePatchFile(patchFile), {
    //       baseFs: patchFs,
    //       version: sourceVersion,
    //     });
    //   }
    // }

    return generatedPackage;
  }
}
