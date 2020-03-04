import {Hooks as CoreHooks,  Plugin, } from '@yarnpkg/core';
import {reduceDependency} from './add-prebuilt-dependencies'
import { PrebuildFetcher } from './fetcher';
import { PrebuildResolver } from './resolver';

const plugin: Plugin<CoreHooks> = {
  hooks: {
    reduceDependency,
  },
  fetchers: [
    PrebuildFetcher,
  ],
  resolvers: [
    PrebuildResolver,
  ],
};

// eslint-disable-next-line arca/no-default-export
export default plugin;
