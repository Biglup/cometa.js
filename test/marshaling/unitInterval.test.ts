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

import * as Cometa from '../../src';

/* TESTS **********************************************************************/

describe('UnitInterval', () => {
  beforeAll(async () => {
    await Cometa.ready();
  });

  describe('readUnitInterval', () => {
    it('should read a valid UnitInterval value', () => {
      const value = 0.25;
      const ptr = Cometa.writeUnitIntervalAsDouble(value);
      const result = Cometa.readUnitIntervalAsDouble(ptr);
      expect(result).toBe(value);
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.readUnitIntervalAsDouble(0)).toThrow('Pointer is null');
    });
  });

  describe('writeUnitInterval', () => {
    it('should create a UnitInterval from a valid string value', () => {
      const value = '0.75';
      const ptr = Cometa.writeUnitIntervalAsDouble(value);
      expect(ptr).toBeGreaterThan(0);
      const result = Cometa.readUnitIntervalAsDouble(ptr);
      expect(result).toBe(0.75);
    });

    it('should create a UnitInterval from a valid number value', () => {
      const value = 0.75;
      const ptr = Cometa.writeUnitIntervalAsDouble(value);
      expect(ptr).toBeGreaterThan(0);
      const result = Cometa.readUnitIntervalAsDouble(ptr);
      expect(result).toBe(value);
    });

    it('should throw an error for invalid string value', () => {
      expect(() => Cometa.writeUnitIntervalAsDouble('1.5')).toThrow('Invalid UnitInterval value');
      expect(() => Cometa.writeUnitIntervalAsDouble('-0.1')).toThrow('Invalid UnitInterval value');
      expect(() => Cometa.writeUnitIntervalAsDouble('not a number')).toThrow('Invalid UnitInterval value');
    });

    it('should throw an error for invalid number value', () => {
      expect(() => Cometa.writeUnitIntervalAsDouble(1.5)).toThrow('Invalid UnitInterval value');
      expect(() => Cometa.writeUnitIntervalAsDouble(-0.1)).toThrow('Invalid UnitInterval value');
      expect(() => Cometa.writeUnitIntervalAsDouble(Number.NaN)).toThrow('Invalid UnitInterval value');
    });

    it('should handle edge cases correctly', () => {
      expect(() => Cometa.writeUnitIntervalAsDouble('0')).not.toThrow();
      expect(() => Cometa.writeUnitIntervalAsDouble('1')).not.toThrow();
      expect(() => Cometa.writeUnitIntervalAsDouble('0.5')).not.toThrow();
      expect(() => Cometa.writeUnitIntervalAsDouble(0)).not.toThrow();
      expect(() => Cometa.writeUnitIntervalAsDouble(1)).not.toThrow();
      expect(() => Cometa.writeUnitIntervalAsDouble(0.5)).not.toThrow();
    });
  });

  describe('derefUnitInterval', () => {
    it('should dereference a valid UnitInterval pointer', () => {
      const ptr = Cometa.writeUnitIntervalAsDouble(0.5);
      expect(() => Cometa.derefUnitInterval(ptr)).not.toThrow();
    });

    it('should throw an error for null pointer', () => {
      expect(() => Cometa.derefUnitInterval(0)).toThrow('Pointer is null');
    });

    it('should allow reading after dereferencing if ref count > 1', () => {
      const ptr = Cometa.writeUnitIntervalAsDouble(0.5);
      const module = Cometa.getModule();

      // Increment ref count
      module.unit_interval_ref(ptr);

      // First deref
      Cometa.derefUnitInterval(ptr);

      // Should still be able to read
      const value = Cometa.readUnitIntervalAsDouble(ptr);
      expect(value).toBe(0.5);

      // Final deref
      Cometa.derefUnitInterval(ptr);
    });
  });
});
