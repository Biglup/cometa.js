/**
 * Copyright 2024 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS ********************************************************************/

import * as Cometa from '../../dist/cjs';

/* TESTS **********************************************************************/

const testVectors = [
  {
    dkLen: 32,
    expectedSha512: '867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252',
    iterations: 1,
    password: 'password',
    salt: 'salt'
  },
  {
    dkLen: 32,
    expectedSha512: 'e1d9c16aa681708a45f5c7c4e215ceb66e011a2e9f0040713f18aefdb866d53c',
    iterations: 2,
    password: 'password',
    salt: 'salt'
  },
  {
    dkLen: 64,
    expectedSha512:
      '867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252c02d470a285a0501bad999bfe943c08f050235d7d68b1da55e63f73b60a57fce',
    iterations: 1,
    password: 'password',
    salt: 'salt'
  },
  {
    dkLen: 64,
    expectedSha512:
      'e1d9c16aa681708a45f5c7c4e215ceb66e011a2e9f0040713f18aefdb866d53cf76cab2868a39b9f7840edce4fef5a82be67335c77a6068e04112754f27ccf4e',
    iterations: 2,
    password: 'password',
    salt: 'salt'
  },
  {
    dkLen: 32,
    expectedSha512: 'd197b1b33db0143e018b12f3d1d1479e6cdebdcc97c5c0f87f6902e072f457b5',
    iterations: 4096,
    password: 'password',
    salt: 'salt'
  },
  {
    dkLen: 40,
    expectedSha512: '8c0511f4c6e597c6ac6315d8f0362e225f3c501495ba23b868c005174dc4ee71115b59f9e60cd953',
    iterations: 4096,
    password: 'passwordPASSWORDpassword',
    salt: 'saltSALTsaltSALTsaltSALTsaltSALTsalt'
  },
  {
    dkLen: 16,
    expectedSha512: '336d14366099e8aac2c46c94a8f178d2',
    iterations: 4096,
    password: 'pass\u00000word',
    salt: 'sa\u00000lt'
  },
  { dkLen: 10, expectedSha512: '867f70cf1ade02cff375', iterations: 1, password: 'password', salt: 'salt' },
  {
    dkLen: 100,
    expectedSha512:
      '867f70cf1ade02cff3752599a3a53dc4af34c7a669815ae5d513554e1c8cf252c02d470a285a0501bad999bfe943c08f050235d7d68b1da55e63f73b60a57fce7b532e206c2967d4c7d2ffa460539fc4d4e5eec70125d74c6c7cf86d25284f297907fcea',
    iterations: 1,
    password: 'password',
    salt: 'salt'
  }
];

describe('Pbkdf2HmacSha512', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  for (const { password, salt, iterations, dkLen, expectedSha512 } of testVectors) {
    test(`PBKDF2 HMAC-SHA512 with password "${password}" and salt "${salt}"`, () => {
      const passwordBytes = new TextEncoder().encode(password);
      const saltBytes = new TextEncoder().encode(salt);
      const derivedKey = Cometa.Pbkdf2HmacSha512.compute(passwordBytes, saltBytes, iterations, dkLen);
      const derivedKeyHex = Cometa.uint8ArrayToHex(derivedKey);

      expect(derivedKeyHex).toBe(expectedSha512);
    });
  }
});
