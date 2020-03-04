import {Resolver, ResolveOptions, MinimalResolveOptions, DescriptorHash, hashUtils, MessageName, LinkType} from '@yarnpkg/core';
import {Descriptor, Locator, Package}                                               from '@yarnpkg/core';
import {structUtils}                                                                from '@yarnpkg/core';
import * as utils                                                              from './utils';

export class PrebuildResolver implements Resolver {
  supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions) {
    if (!descriptor.range.startsWith(`prebuild:`))
      return false;

    return true;
  }

  supportsLocator(locator: Locator, opts: MinimalResolveOptions) {
    if (!locator.reference.startsWith(`prebuild:`))
      return false;

    return true;
  }

  shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions) {
    return false;
  }

  bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions) {
    return descriptor;
  }

  getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions) {
    return [];
  }

  async getCandidates(descriptor: Descriptor, dependencies: Map<DescriptorHash, Package>, opts: ResolveOptions) {
    if (!opts.fetchOptions)
      throw new Error(`Assertion failed: This resolver cannot be used unless a fetcher is configured`);

    return [structUtils.makeLocator(structUtils.parseIdent("bindings"), descriptor.range)];
  }

  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    // We have to defer all the actual resolution until the rest of the tree is figured out
    // We'll figure out our actual node files in the fetch step once everything else is resolved.
    return {
      ...locator,

      version: `*`,

      languageName: opts.project.configuration.get(`defaultLanguageName`),
      linkType: LinkType.HARD,

      dependencies: new Map(),
      peerDependencies: new Map(),

      dependenciesMeta: new Map(),
      peerDependenciesMeta: new Map(),

      bin: new Map(),
    }
  }
}


/*
console.log("Resolving", locator, opts)

Resolving {
  identHash: '506bee4e4f3a852fb0fd1482b2821ecfdc8de562b60c04863f8334092268ddcfb44091b63bdffbe1e23e0275d0678d6886b1ea9a6193420b2102a9a950bf5699',
  scope: null,
  name: '@serialport-bindings',
  locatorHash: 'fdd70c5f6ea51a1a063a91625aa7b8950eb3091f9f62dd85243e9d9ab88eda1144c50ddddb65665aabc583cc1ee5532b26c01b3d0f840b94d89c7a2133c1f5a8',
  reference: 'prebuild:bindings@^1.5.0#builtin<prebuild/@serialport-bindings%3Aelectron@8.0.3>'
} {
  project: T {
    resolutionAliases: Map {},
    workspaces: [ [Object] ],
    workspacesByCwd: Map {
      '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test' => [Object]
    },
    workspacesByIdent: Map {
      'ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff' => [Object]
    },
    storedResolutions: Map {},
    storedDescriptors: Map {},
    storedPackages: Map {},
    storedChecksums: Map {},
    accessibleLocators: Set {},
    originalPackages: Map {},
    optionalBuilds: Set {},
    lockFileChecksum: null,
    configuration: O {
      plugins: [Map],
      settings: [Map],
      values: [Map],
      sources: Map {},
      invalid: Map {},
      packageExtensions: [Map],
      startingCwd: '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test',
      projectCwd: '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test'
    },
    cwd: '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test'
  },
  report: f {
    reportedInfos: Set {},
    reportedWarnings: Set {},
    reportedErrors: Set {},
    cacheHitCount: 0,
    cacheMissCount: 0,
    warningCount: 1,
    errorCount: 0,
    startTime: 1583295742366,
    indent: 1,
    progress: Map {},
    progressTime: 0,
    progressFrame: 0,
    progressTimeout: null,
    forgettableLines: [],
    configuration: O {
      plugins: [Map],
      settings: [Map],
      values: [Map],
      sources: Map {},
      invalid: Map {},
      packageExtensions: [Map],
      startingCwd: '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test',
      projectCwd: '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test'
    },
    includeFooter: true,
    includeInfos: true,
    includeWarnings: true,
    json: false,
    stdout: WriteStream {
      connecting: false,
      _hadError: false,
      _parent: null,
      _host: null,
      _readableState: [ReadableState],
      readable: false,
      _events: [Object],
      _eventsCount: 2,
      _maxListeners: undefined,
      _writableState: [WritableState],
      writable: true,
      allowHalfOpen: false,
      _sockname: null,
      _pendingData: null,
      _pendingEncoding: '',
      server: null,
      _server: null,
      columns: 266,
      rows: 59,
      _type: 'tty',
      fd: 1,
      _isStdio: true,
      destroySoon: [Function: destroy],
      _destroy: [Function: dummyDestroy],
      [Symbol(asyncId)]: 4,
      [Symbol(kHandle)]: [TTY],
      [Symbol(lastWriteQueueSize)]: 0,
      [Symbol(timeout)]: null,
      [Symbol(kBytesRead)]: 0,
      [Symbol(kBytesWritten)]: 0
    }
  },
  resolver: { resolvers: [ {}, [Object], [Object] ] },
  fetchOptions: {
    project: T {
      resolutionAliases: Map {},
      workspaces: [Array],
      workspacesByCwd: [Map],
      workspacesByIdent: [Map],
      storedResolutions: Map {},
      storedDescriptors: Map {},
      storedPackages: Map {},
      storedChecksums: Map {},
      accessibleLocators: Set {},
      originalPackages: Map {},
      optionalBuilds: Set {},
      lockFileChecksum: null,
      configuration: [O],
      cwd: '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test'
    },
    cache: C {
      markedFiles: Set {},
      mutexes: Map {},
      configuration: [O],
      cwd: '/Users/michaelorenstein/Documents/Projects/electron-pnp-bundler-test/.yarn/cache',
      immutable: false,
      check: false
    },
    checksums: Map {},
    report: f {
      reportedInfos: Set {},
      reportedWarnings: Set {},
      reportedErrors: Set {},
      cacheHitCount: 0,
      cacheMissCount: 0,
      warningCount: 1,
      errorCount: 0,
      startTime: 1583295742366,
      indent: 1,
      progress: Map {},
      progressTime: 0,
      progressFrame: 0,
      progressTimeout: null,
      forgettableLines: [],
      configuration: [O],
      includeFooter: true,
      includeInfos: true,
      includeWarnings: true,
      json: false,
      stdout: [WriteStream]
    },
    fetcher: { fetchers: [Array] }
  }
}
*/
