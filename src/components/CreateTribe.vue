<script setup lang="ts">
import { ref } from 'vue'
import { SimplePool, type EventTemplate, nip19 } from 'nostr-tools'

var pubkey: string = ''
const pool = new SimplePool()

// Form data
const name = ref('')
const description = ref('')
const picture = ref('')
const relays = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref(false)

function normalizeRelay(relay: string){
  if (relay.search('://')) return relay.trim()
  return 'wss://'+relay.trim()
}

function generateIdentifier(name: string): string {
  // Normalize the string to decompose accented characters
  let normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  // Convert to lowercase
  normalized = normalized.toLowerCase()
  
  // Replace any non-alphanumeric character with a hyphen
  normalized = normalized.replace(/[^a-z0-9]+/g, '-')
  
  // Remove leading/trailing hyphens
  normalized = normalized.replace(/^-+|-+$/g, '')
  
  // Collapse multiple hyphens to a single hyphen
  normalized = normalized.replace(/-+/g, '-')
  
  return normalized
}

async function createTribe() {
  error.value = ''
  success.value = false

  // Validation
  if (!name.value.trim()) {
    error.value = 'Name is required'
    return
  }

  if (!relays.value.trim()) {
    error.value = 'At least one relay is required'
    return
  }

  isLoading.value = true

  try {
    // Get current user's public key
    pubkey = await window.nostr!.getPublicKey()

    // Generate identifier from the tribe name
    const identifier = generateIdentifier(name.value.trim())

    // Generate a list of relays
    const relayList = relays.value.split(',').map(normalizeRelay)

    // Create the event template (kind 32149 for tribe)
    const eventTemplate: EventTemplate = {
      kind: 32149,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['d', identifier],
        ['name', name.value.trim()],
        ['description', description.value.trim()],
      ],
      content: ''
    }

    // Add picture tag if provided
    if (picture.value.trim()) {
      eventTemplate.tags.push(['image', picture.value.trim()])
    }

    // Add relay tags
    relayList.forEach(relay => {
      eventTemplate.tags.push(['relay', relay])
    })

    // Sign the event
    const signedEvent = await window.nostr!.signEvent(eventTemplate)

    console.log('Signed event:', signedEvent)

    // Publish to all specified relays and wss://relay.nostr.hu
    const allRelays = [...new Set([...relayList, 'wss://relay.nostr.hu'])]

    const publishPromises = pool.publish(allRelays, signedEvent)

    await Promise.allSettled(publishPromises)

    success.value = true

    // Wait a moment then redirect to the tribe page
    setTimeout(() => {
      const naddr = nip19.naddrEncode({
        kind: 32149,
        pubkey,
        identifier: identifier,
        relays: allRelays
      })
      window.location.assign(`/${naddr}`)
    }, 2000)

  } catch (e: any) {
    error.value = `Failed to create tribe: ${e.message || e}`
    console.error('Error creating tribe:', e)
  } finally {
    isLoading.value = false
  }
}

function cancel() {
  window.location.assign('/')
}
</script>

<template>
  <div class="create-tribe-container">
    <div class="create-tribe-card">
      <h2>Create a New Tribe</h2>
      <p class="subtitle">Fill in the details to create your Nostr tribe</p>

      <form @submit.prevent="createTribe" class="tribe-form">
        <div class="form-group">
          <label for="name">Tribe Name *</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="Enter tribe name"
            :disabled="isLoading"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            v-model="description"
            placeholder="Describe your tribe..."
            rows="4"
            :disabled="isLoading"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="picture">Picture URL</label>
          <input
            id="picture"
            v-model="picture"
            type="url"
            placeholder="https://example.com/image.png"
            :disabled="isLoading"
          />
        </div>

        <div class="form-group">
          <label for="relays">Relays *</label>
          <input
            id="relays"
            v-model="relays"
            type="text"
            placeholder="wss://relay1.com, wss://relay2.com"
            :disabled="isLoading"
            required
          />
          <small>Comma-separated list of relay URLs. The tribe will also be published to wss://relay.nostr.hu</small>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="success" class="success-message">
          Tribe created successfully! Redirecting...
        </div>

        <div class="form-actions">
          <button type="button" @click="cancel" :disabled="isLoading" class="btn-cancel">
            Cancel
          </button>
          <button type="submit" :disabled="isLoading" class="btn-submit">
            {{ isLoading ? 'Creating...' : 'Create Tribe' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-tribe-container {
  width: 100%;
  max-width: 600px;
  padding: 20px;
  margin: 40px auto;
}

.create-tribe-card {
  background: #222;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

h2 {
  font-size: 2em;
  margin: 0 0 10px 0;
  text-align: center;
}

.subtitle {
  text-align: center;
  color: #aaa;
  margin-bottom: 30px;
  font-size: 0.95em;
}

.tribe-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #ddd;
  font-size: 0.95em;
}

.form-group input,
.form-group textarea {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #444;
  background: #333;
  color: #fff;
  font-size: 1em;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #7B68EE;
}

.form-group input:disabled,
.form-group textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-group small {
  color: #888;
  font-size: 0.85em;
}

.error-message {
  background-color: #8B0000;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9em;
}

.success-message {
  background-color: #006400;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  font-size: 0.9em;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #555;
  color: #fff;
}

.btn-cancel:hover:not(:disabled) {
  background: #666;
}

.btn-submit {
  background: #7B68EE;
  color: #fff;
}

.btn-submit:hover:not(:disabled) {
  background: #6A57DD;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(123, 104, 238, 0.3);
}

.btn-cancel:disabled,
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .create-tribe-container {
    padding: 10px;
    margin: 20px auto;
  }

  .create-tribe-card {
    padding: 24px;
  }
}
</style>
