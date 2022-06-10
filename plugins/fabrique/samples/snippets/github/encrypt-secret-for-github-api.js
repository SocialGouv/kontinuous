#!/usr/bin/env node

// from https://docs.github.com/en/rest/actions/secrets#example-encrypting-a-secret-using-nodejs

const fs = require("fs")

const sodium = require('tweetsodium');

const b64Key = process.env.BASE64_ENCODED_PUBLIC_KEY

const keyBytes = Buffer.from(b64Key, 'base64')

const stdinBuffer = fs.readFileSync(0)

const encryptedBytes = sodium.seal(stdinBuffer, keyBytes);

const encrypted = Buffer.from(encryptedBytes).toString('base64');

process.stdout.write(encrypted)
