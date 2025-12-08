<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SimplePool, type Event } from 'nostr-tools'
import { nip19 } from 'nostr-tools'
import { tval } from '../utils'

interface TribeData {
  event: Event
  name: string
  description: string
  image: string
  leader: string
  leaderName: string
  naddr: string
}

const tribes = ref<TribeData[]>([])
const loading = ref(true)
const pool = new SimplePool()

// Default relay to search for tribes
const relays = [
  'wss://relay.nostr.hu'
]

async function fetchLeaderName(pubkey: string): Promise<string> {
  try {
    let profiles = await pool.querySync(relays, { authors: [pubkey], kinds: [0] }, { maxWait: 3000 })
    if (profiles && profiles.length > 0) {
      let json = JSON.parse(profiles[0].content)
      return json.name || json.display_name || pubkey.slice(0, 8) + '...'
    }
  } catch (e) {
    console.error('Error fetching leader name:', e)
  }
  return pubkey.slice(0, 8) + '...'
}

async function loadTribes() {
  loading.value = true
  try {
    // Query for tribe events (kind 32149)
    const events = await pool.querySync(relays, { kinds: [32149], limit: 50 }, { timeout: 5000 })

    if (events && events.length > 0) {
      // Process each tribe event
      const tribePromises = events.map(async (event) => {
        const name = tval(event, 'name') || 'Unnamed Tribe'
        const description = tval(event, 'description') || 'No description'
        const image = tval(event, 'image') || '/logo.png'
        const dtag = tval(event, 'd') || ''
        const leader = event.pubkey
        const leaderName = await fetchLeaderName(leader)

        // Create naddr for the tribe
        const naddr = nip19.naddrEncode({
          kind: 32149,
          pubkey: leader,
          identifier: dtag,
          relays: relays
        })

        return {
          event,
          name,
          description,
          image,
          leader,
          leaderName,
          naddr
        }
      })

      tribes.value = await Promise.all(tribePromises)
    }
  } catch (e) {
    console.error('Error loading tribes:', e)
  } finally {
    loading.value = false
  }
}

function navigateToTribe(naddr: string) {
  window.location.href = `/${naddr}`
}

onMounted(() => {
  loadTribes()
})
</script>

<template>
  <div class="tribe-list-container">
    <h2>Discover Tribes</h2>
    <p class="subtitle">
      Browse Nostr Tribes. Learn more on
      <a href="https://tribewiki.org/Tribe" target="_blank">tribewiki</a>.
    </p>

    <div v-if="loading" class="loading">
      <p>Loading tribes...</p>
    </div>

    <div v-else-if="tribes.length === 0" class="no-tribes">
      <p>No tribes found. Be the first to create one!</p>
    </div>

    <div v-else class="tribe-grid">
      <div
        v-for="tribe in tribes"
        :key="tribe.naddr"
        class="tribe-card"
        @click="navigateToTribe(tribe.naddr)"
      >
        <div class="tribe-card-image-container">
          <img :src="tribe.image" :alt="tribe.name" class="tribe-card-image" @error="(e) => (e.target as HTMLImageElement).src = '/logo.png'" />
        </div>
        <div class="tribe-card-content">
          <h3 class="tribe-card-title">{{ tribe.name }}</h3>
          <p class="tribe-card-description">{{ tribe.description }}</p>
          <div class="tribe-card-leader">
            <span class="leader-label">Leader:</span>
            <span class="leader-name">{{ tribe.leaderName }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tribe-list-container {
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  margin: 0 auto;
}

h2 {
  font-size: 2em;
  margin-bottom: 10px;
  text-align: center;
}

.subtitle {
  text-align: center;
  color: #aaa;
  margin-bottom: 30px;
}

.subtitle a {
  color: #7B68EE;
  text-decoration: none;
}

.subtitle a:hover {
  text-decoration: underline;
}

.loading, .no-tribes {
  text-align: center;
  padding: 40px;
  color: #888;
  font-size: 1.1em;
}

.tribe-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 10px;
  justify-content: center;
}

.tribe-card {
  background: #222;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  width: 280px;
  flex-shrink: 0;
}

.tribe-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(123, 104, 238, 0.4);
}

.tribe-card-image-container {
  width: 100%;
  height: 180px;
  overflow: hidden;
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tribe-card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tribe-card-content {
  padding: 16px;
}

.tribe-card-title {
  font-size: 1.3em;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tribe-card-description {
  font-size: 0.95em;
  color: #ccc;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 3.6em;
}

.tribe-card-leader {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  padding-top: 8px;
  border-top: 1px solid #444;
}

.leader-label {
  color: #888;
  font-weight: 500;
}

.leader-name {
  color: #7B68EE;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .tribe-grid {
    gap: 16px;
  }

  .tribe-card {
    width: 240px;
  }

  .tribe-card-image-container {
    height: 150px;
  }
}
</style>
