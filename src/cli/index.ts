#!/usr/bin/env node
import { parse } from './options';

const options = parse();

console.log('final:', options);