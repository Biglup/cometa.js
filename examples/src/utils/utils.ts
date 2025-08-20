/* eslint-disable no-console */
/**
 * Copyright 2025 Biglup Labs.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may not use this file except in compliance with the License.
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

/* IMPORTS ********************************************************************/

import 'dotenv/config';
import { TextEncoder } from 'util';
import prompts from 'prompts';

/* DEFINITIONS ****************************************************************/

/**
 * Securely prompts the user for a password in the terminal.
 * The input will be masked.
 * @returns A Promise that resolves to the password as a Uint8Array.
 */
export const getPassword = async (): Promise<Uint8Array> => {
  const response = await prompts({
    message: 'Please enter your password:',
    name: 'value',
    type: 'password'
  });

  if (!response.value) {
    console.warn('Password entry cancelled.');
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(0);
  }

  return new TextEncoder().encode(response.value);
};

/**
 * Retrieves the Blockfrost project ID from the environment variable `BLOCKFROST_PROJECT_ID`.
 *
 * @returns The Blockfrost project ID as a string.
 * @throws Will throw an error if the environment variable is not set.
 */
export const getBlockfrostProjectIdFromEnv = (): string => {
  const projectId = process.env.BLOCKFROST_PROJECT_ID;

  if (!projectId) {
    throw new Error('BLOCKFROST_PROJECT_ID is not set in the .env file.');
  }

  return projectId;
};

/**
 * Calculates a future Date by adding a specified number of seconds to the current time.
 * @param seconds The number of seconds to add to the current time.
 * @returns A new Date object set to the future time.
 */
export const getTimeFromNow = (seconds: number): Date => {
  // Get the current time in milliseconds and add the desired seconds (converted to milliseconds)
  const futureTime = Date.now() + seconds * 1000;
  return new Date(futureTime);
};
