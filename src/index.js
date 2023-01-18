"use strict";

// ************************************************************************
/* READ CODE FROM STDIN */

const readline = require('readline');
const {main} = require('./interpreter');


// this will collect all input from stdin as Array<string>
const input = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  input.push(line);
});

rl.once('close', () => {
  main(input);
});
