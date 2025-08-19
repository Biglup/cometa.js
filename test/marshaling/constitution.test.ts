/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* IMPORTS *******************************************************************/

import * as Cometa from '../../dist/cjs';
import { MemoryLeakDetector } from '../util/memory';

/* TESTS *********************************************************************/

describe('Constitution', () => {
  let detector: MemoryLeakDetector;

  const VALID_ANCHOR: Cometa.Anchor = {
    dataHash: 'e1b8b580951c6c97ac1b62e4c2787de794611ce5179261a2f447228801d93963',
    url: 'https://example.com/constitution.json'
  };
  const VALID_SCRIPT_HASH = 'e1b8b580951c6c97ac1b62e4c2787de794611ce5179261a2f447228801d93963';

  const CONSTITUTION_WITH_HASH: Cometa.Constitution = {
    anchor: VALID_ANCHOR,
    scriptHash: VALID_SCRIPT_HASH
  };

  const CONSTITUTION_WITHOUT_HASH: Cometa.Constitution = {
    anchor: VALID_ANCHOR
  };

  beforeAll(async () => {
    await Cometa.ready();
  });

  beforeEach(() => {
    detector = new MemoryLeakDetector(Cometa.getModule());
    detector.start();
  });

  afterEach(() => {
    detector.stop();
    detector.detect();
  });

  it('should correctly write and read a constitution with a script hash', () => {
    const ptr = Cometa.writeConstitution(CONSTITUTION_WITH_HASH);
    try {
      const readValue = Cometa.readConstitution(ptr);
      expect(readValue).toEqual(CONSTITUTION_WITH_HASH);
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  it('should correctly write and read a constitution without a script hash', () => {
    const ptr = Cometa.writeConstitution(CONSTITUTION_WITHOUT_HASH);
    try {
      const readValue = Cometa.readConstitution(ptr);
      expect(readValue).toEqual(CONSTITUTION_WITHOUT_HASH);
      expect(readValue.scriptHash).toBeUndefined();
    } finally {
      Cometa.unrefObject(ptr);
    }
  });

  it('writeConstitution should throw for an invalid script hash', () => {
    const invalidConstitution = {
      ...CONSTITUTION_WITH_HASH,
      scriptHash: 'this-is-not-valid-hex'
    };
    expect(() => Cometa.writeConstitution(invalidConstitution)).toThrow();
  });

  it('should not leak memory when processing constitutions', () => {
    const constitutionsToTest = [CONSTITUTION_WITH_HASH, CONSTITUTION_WITHOUT_HASH];

    for (const constitution of constitutionsToTest) {
      const ptr = Cometa.writeConstitution(constitution);
      const readValue = Cometa.readConstitution(ptr);
      expect(readValue).toEqual(constitution);
      Cometa.unrefObject(ptr);
    }
  });
});
