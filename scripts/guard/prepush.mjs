#!/usr/bin/env node
import {execSync} from 'node:child_process';


function sh(cmd){return execSync(cmd,{stdio:'pipe'}).toString();}
function fail(msg){console.error(`\n❌ ${msg}`);process.exit(1);}


// Diff range for push
let range;
try{sh('git rev-parse --abbrev-ref --symbolic-full-name @{u}');range='@{u}..';}catch{range='HEAD^..HEAD';}


// 1) Size gate
const files=sh(`git diff --name-only ${range}`).split('\n').filter(Boolean);
for(const f of files){try{const n=Number(sh(`wc -c < "${f}"`).trim());if(n>80_000_000)fail(`${f} is >80MB. Use LFS or archive outside repo.`);}catch{/* ignore deleted files */ }}


// 2) Secret strings quick scan
const secrets=sh('git grep -nE "(PRIVATE_STOREFRONT_API_TOKEN|SESSION_SECRET|shpat_[0-9a-f]{8,})" -- . || true');
if(secrets.trim())fail(`Potential secret found in:\n${secrets}`);


// 3) Raw env usage in app/**
const envHits=sh('git grep -nE "(process\\.env|import\\.meta\\.env|context\\.env)" -- app/ || true');
if(envHits.trim())fail(`Raw env usage found in app/**. Use env helpers.\n${envHits}`);


console.log('✅ Pre-push guard OK');