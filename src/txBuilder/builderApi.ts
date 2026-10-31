/**
 * Copyright 2025 Biglup Labs.
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

/* IMPORTS *******************************************************************/

import { getModule } from '../module';

/* DEFINITIONS ****************************************************************/

/** @internal */
export const transactionBuilderApi = () => {
  const m = getModule();
  return {
    add_certificate: m.tx_builder_add_certificate,
    add_datum: m.tx_builder_add_datum,
    add_input: m.tx_builder_add_input,
    add_output: m.tx_builder_add_output,
    add_reference_input: m.tx_builder_add_reference_input,
    add_script: m.tx_builder_add_script,
    add_signer_ex: m.tx_builder_add_signer_ex,
    delegate_stake_ex: m.tx_builder_delegate_stake_ex,
    delegate_voting_power_ex: m.tx_builder_delegate_voting_power_ex,
    deregister_drep_ex: m.tx_builder_deregister_drep_ex,
    deregister_reward_address: m.tx_builder_deregister_reward_address,
    deregister_reward_address_ex: m.tx_builder_deregister_reward_address_ex,
    lock_lovelace: m.tx_builder_lock_lovelace,
    lock_lovelace_ex: m.tx_builder_lock_lovelace_ex,
    lock_value: m.tx_builder_lock_value,
    lock_value_ex: m.tx_builder_lock_value_ex,
    mint_token_with_id_ex: m.tx_builder_mint_token_with_id_ex,
    propose_hardfork: m.tx_builder_propose_hardfork,
    propose_info: m.tx_builder_propose_info,
    propose_new_constitution: m.tx_builder_propose_new_constitution,
    propose_no_confidence: m.tx_builder_propose_no_confidence,
    propose_parameter_change: m.tx_builder_propose_parameter_change,
    propose_treasury_withdrawals: m.tx_builder_propose_treasury_withdrawals,
    propose_update_committee: m.tx_builder_propose_update_committee,
    add_guard: m.tx_builder_add_guard,
    add_guard_with_redeemer: m.tx_builder_add_guard_with_redeemer,
    add_direct_deposit_ex: m.tx_builder_add_direct_deposit_ex,
    add_account_balance_interval_ex: m.tx_builder_add_account_balance_interval_ex,
    add_input_with_deferred_redeemer: m.tx_builder_add_input_with_deferred_redeemer,
    mint_token_with_deferred_redeemer: m.tx_builder_mint_token_with_deferred_redeemer,
    withdraw_rewards_with_deferred_redeemer: m.tx_builder_withdraw_rewards_with_deferred_redeemer,
    add_certificate_with_deferred_redeemer: m.tx_builder_add_certificate_with_deferred_redeemer,
    vote_with_deferred_redeemer: m.tx_builder_vote_with_deferred_redeemer,
    refcount: m.tx_builder_refcount,
    register_drep_ex: m.tx_builder_register_drep_ex,
    register_reward_address: m.tx_builder_register_reward_address,
    register_reward_address_ex: m.tx_builder_register_reward_address_ex,
    send_lovelace: m.tx_builder_send_lovelace,
    send_lovelace_ex: m.tx_builder_send_lovelace_ex,
    send_value: m.tx_builder_send_value,
    send_value_ex: m.tx_builder_send_value_ex,
    set_donation: m.tx_builder_set_donation,
    set_invalid_after: m.tx_builder_set_invalid_after,
    set_invalid_after_ex: m.tx_builder_set_invalid_after_ex,
    set_invalid_before: m.tx_builder_set_invalid_before,
    set_invalid_before_ex: m.tx_builder_set_invalid_before_ex,
    set_metadata_ex: m.tx_builder_set_metadata_ex,
    set_network_id: m.tx_builder_set_network_id,
    update_drep_ex: m.tx_builder_update_drep_ex,
    vote: m.tx_builder_vote,
    withdraw_rewards: m.tx_builder_withdraw_rewards,
    withdraw_rewards_ex: m.tx_builder_withdraw_rewards_ex
  };
};

/** @internal */
export const subTransactionBuilderApi = () => {
  const m = getModule();
  return {
    add_certificate: m.sub_tx_builder_add_certificate,
    add_datum: m.sub_tx_builder_add_datum,
    add_input: m.sub_tx_builder_add_input,
    add_output: m.sub_tx_builder_add_output,
    add_reference_input: m.sub_tx_builder_add_reference_input,
    add_script: m.sub_tx_builder_add_script,
    add_signer_ex: m.sub_tx_builder_add_signer_ex,
    delegate_stake_ex: m.sub_tx_builder_delegate_stake_ex,
    delegate_voting_power_ex: m.sub_tx_builder_delegate_voting_power_ex,
    deregister_drep_ex: m.sub_tx_builder_deregister_drep_ex,
    deregister_reward_address: m.sub_tx_builder_deregister_reward_address,
    deregister_reward_address_ex: m.sub_tx_builder_deregister_reward_address_ex,
    lock_lovelace: m.sub_tx_builder_lock_lovelace,
    lock_lovelace_ex: m.sub_tx_builder_lock_lovelace_ex,
    lock_value: m.sub_tx_builder_lock_value,
    lock_value_ex: m.sub_tx_builder_lock_value_ex,
    mint_token_with_id_ex: m.sub_tx_builder_mint_token_with_id_ex,
    propose_hardfork: m.sub_tx_builder_propose_hardfork,
    propose_info: m.sub_tx_builder_propose_info,
    propose_new_constitution: m.sub_tx_builder_propose_new_constitution,
    propose_no_confidence: m.sub_tx_builder_propose_no_confidence,
    propose_parameter_change: m.sub_tx_builder_propose_parameter_change,
    propose_treasury_withdrawals: m.sub_tx_builder_propose_treasury_withdrawals,
    propose_update_committee: m.sub_tx_builder_propose_update_committee,
    add_guard: m.sub_tx_builder_add_guard,
    add_guard_with_redeemer: m.sub_tx_builder_add_guard_with_redeemer,
    add_direct_deposit_ex: m.sub_tx_builder_add_direct_deposit_ex,
    add_account_balance_interval_ex: m.sub_tx_builder_add_account_balance_interval_ex,
    add_input_with_deferred_redeemer: m.sub_tx_builder_add_input_with_deferred_redeemer,
    mint_token_with_deferred_redeemer: m.sub_tx_builder_mint_token_with_deferred_redeemer,
    withdraw_rewards_with_deferred_redeemer: m.sub_tx_builder_withdraw_rewards_with_deferred_redeemer,
    add_certificate_with_deferred_redeemer: m.sub_tx_builder_add_certificate_with_deferred_redeemer,
    vote_with_deferred_redeemer: m.sub_tx_builder_vote_with_deferred_redeemer,
    refcount: m.sub_tx_builder_refcount,
    register_drep_ex: m.sub_tx_builder_register_drep_ex,
    register_reward_address: m.sub_tx_builder_register_reward_address,
    register_reward_address_ex: m.sub_tx_builder_register_reward_address_ex,
    send_lovelace: m.sub_tx_builder_send_lovelace,
    send_lovelace_ex: m.sub_tx_builder_send_lovelace_ex,
    send_value: m.sub_tx_builder_send_value,
    send_value_ex: m.sub_tx_builder_send_value_ex,
    set_donation: m.sub_tx_builder_set_donation,
    set_invalid_after: m.sub_tx_builder_set_invalid_after,
    set_invalid_after_ex: m.sub_tx_builder_set_invalid_after_ex,
    set_invalid_before: m.sub_tx_builder_set_invalid_before,
    set_invalid_before_ex: m.sub_tx_builder_set_invalid_before_ex,
    set_metadata_ex: m.sub_tx_builder_set_metadata_ex,
    set_network_id: m.sub_tx_builder_set_network_id,
    update_drep_ex: m.sub_tx_builder_update_drep_ex,
    vote: m.sub_tx_builder_vote,
    withdraw_rewards: m.sub_tx_builder_withdraw_rewards,
    withdraw_rewards_ex: m.sub_tx_builder_withdraw_rewards_ex
  };
};
