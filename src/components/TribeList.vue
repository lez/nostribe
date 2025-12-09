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
  npub: string
}

const tribes = ref<TribeData[]>([])
const loading = ref(true)
const pool = new SimplePool()

// Default relay to search for tribes
const relays = [
  'wss://relay.nostr.hu'
]

function shortNpub(pubkey: string): string {
  const npub = nip19.npubEncode(pubkey)
  return npub.slice(0, 12) + '...'
}

async function fetchLeaderName(pubkey: string, tribeIndex: number) {
  try {
    let profiles = await pool.querySync(relays, { authors: [pubkey], kinds: [0] }, { maxWait: 3000 })
    if (profiles && profiles.length > 0) {
      let json = JSON.parse(profiles[0].content)
      const name = json.name || json.display_name
      if (name) {
        // Update the tribe's leader name in the reactive array
        tribes.value[tribeIndex].leaderName = name
      }
    }
  } catch (e) {
    console.error('Error fetching leader name:', e)
  }
}

async function loadTribes() {
  loading.value = true
  try {
    // Query for tribe events (kind 32149)
    const events = await pool.querySync(relays, { kinds: [32149], limit: 50 }, { maxWait: 5000 })

    if (events && events.length > 0) {
      // Process each tribe event synchronously first
      tribes.value = events.map((event) => {
        const name = tval(event, 'name') || 'Unnamed Tribe'
        const description = tval(event, 'description') || 'No description'
        const image = tval(event, 'image') || '/logo.png'
        const dtag = tval(event, 'd') || ''
        const leader = event.pubkey
        const npub = nip19.npubEncode(leader)
        
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
          leaderName: shortNpub(leader), // Start with short npub
          naddr,
          npub
        }
      })
      
      // Fetch leader profiles in the background
      tribes.value.forEach((tribe, index) => {
        fetchLeaderName(tribe.leader, index)
      })
    }
  } catch (e) {
    console.error('Error loading tribes:', e)
  } finally {
    loading.value = false
  }
}

function navigateToTribe(naddr: string) {
  window.location.assign(`/${naddr}`)
}

onMounted(() => {
  loadTribes()
})
</script>

<template>
  <div class="tribe-list-container">
    <div class="info-card">
      <p class="info-description">
        A <span class="hey">Tribe</span> is a sovereign <span class="hey">group</span> on Nostr, detached from relays.<br>
        Tribes can be carried around between applications, just like your follow list.
      </p>

      <h3>Use Cases</h3>
      <div class="use-cases">
        <div class="use-case">
          <h4>Tribe Relay</h4>
          <p>A relay that stores events for tribe members, providing dedicated infrastructure for community content.</p>
        </div>

        <div class="use-case">
          <h4>Collaborative Wiki</h4>
          <p>Tribewiki allows edits for tribe members and their extended social graph.</p>
        </div>

        <div class="use-case">
          <h4>Tribe Blossom Server</h4>
          <p>A server that stores media files for tribe members. Enter a tribe, get access to multiple services.</p>
        </div>
      </div>

      <p class="learn-more">
        Learn more about tribes on <a href="https://tribewiki.org/Tribe" target="_blank">tribewiki</a>.
      </p>
    </div>

    <h2 class="discover-title">Discover Tribes</h2>

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
.hey {
  font-size: 1.2em;
  color: #7B68EE;
  font-weight: bold;
}
.tribe-list-container {
  width: 100%;
  max-width: 1200px;
  padding: 20px;
  margin: 0 auto;
}

.info-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 40px;
  box-shadow: 0 4px 20px rgba(123, 104, 238, 0.2);
  border: 1px solid #333;
}

.info-card h2 {
  font-size: 2em;
  margin-bottom: 16px;
  text-align: center;
  color: #fff;
  background: linear-gradient(90deg, #7B68EE, #9370DB);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.info-description {
  font-size: 1.1em;
  line-height: 1.7;
  color: #ddd;
  text-align: center;
  margin-bottom: 32px;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}

.info-card h3 {
  font-size: 1.5em;
  margin-bottom: 24px;
  text-align: center;
  color: #7B68EE;
}

.use-cases {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.use-case {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(123, 104, 238, 0.3);
  transition: all 0.3s ease;
}

.use-case:hover {
  transform: translateY(-4px);
  border-color: #7B68EE;
  box-shadow: 0 8px 24px rgba(123, 104, 238, 0.3);
}

.use-case-icon {
  font-size: 2.5em;
  text-align: center;
  margin-bottom: 12px;
}

.use-case h4 {
  font-size: 1.2em;
  margin-bottom: 12px;
  margin-top: 0px;
  text-align: center;
  color: #fff;
}

.use-case p {
  font-size: 0.95em;
  line-height: 1.6;
  color: #bbb;
  text-align: center;
  margin: 0;
}

.learn-more {
  text-align: center;
  color: #aaa;
  font-size: 0.95em;
  margin-top: 24px;
  margin-bottom: 0;
}

.learn-more a {
  color: #7B68EE;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.learn-more a:hover {
  color: #9370DB;
  text-decoration: underline;
}

.discover-title {
  font-size: 2em;
  margin-bottom: 30px;
  text-align: center;
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
