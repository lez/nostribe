<script setup lang="ts">
import TreeNode from './components/TreeNode.vue'
import TribeList from './components/TribeList.vue'
import { Tribe } from 'nostr-tribes'
import { ref, type Ref, onMounted,computed } from 'vue'
import { nip19, SimplePool, type Event } from 'nostr-tools'
import type { AddressPointer } from 'nostr-tools/nip19'
import { tval } from './utils'
import CreateTribe from './components/CreateTribe.vue'

let ready = ref(false)
let pubkey = ref("")
let tribe: Tribe
let error = ref("")
var leader = ref("")
var dtag = ""
let relays: string[] = []
let pool = new SimplePool()
let tribe_event: Ref<Event|undefined> = ref()
let names: Ref<{[key: string]: string}> = ref({})
let page = ref("")

async function fetchName(pubkey: string) {
  let r = await pool.querySync(relays, {authors: [pubkey], kinds: [0]})
  if (!r) return
  let json = JSON.parse(r[0].content)
  if (!json.name) return
  names.value[pubkey] = json.name
}

async function init() {
  await waitForWindowNostr()
  let stripped = window.location.pathname.slice(1)
  // We don't need vue-router because this code is a substitute.
  if (!stripped) {
    page.value = 'main'
    return
  }

  if (stripped.startsWith('nostr:')) {
    // This is a workaround for clients that put a nostr: before naddr, even in the middle of an url.
    window.location.assign('/'+stripped.slice('nostr:'.length))
    return
  }

  if (stripped.startsWith('naddr1')) {
    let decoded = nip19.decode(stripped).data as AddressPointer
    if (decoded.kind !== 32149) {
      error.value = `Invalid event kind ${decoded.kind}. Expected kind is 32149`
      return
    }
    relays = decoded.relays || ["wss://relay.nostribe.org"]
    leader.value = decoded.pubkey ; fetchName(decoded.pubkey)
    dtag = decoded.identifier
    console.log('decoded.relays', decoded.relays)

    let found = await pool.querySync(relays, {authors: [decoded.pubkey], '#d': [dtag], kinds: [32149]})
    if (!found) {
      error.value = "Tribe event not found."
      return
    }
    tribe_event.value = found[0]
    page.value = 'tribe'

    tribe = new Tribe(`32149:${leader.value}:${dtag}`, relays)
    console.log('syncing tribe')
    await tribe.sync()
    await tribe.sync_profiles()

    console.log('tribe synced')
    ready.value = true

    return
  }

  if (stripped == "create") {
    page.value = 'create'
    return
  }

  error.value = "Invalid path"
  return
}
onMounted(init)

async function onLogin() {
  pubkey.value = await window.nostr!.getPublicKey()
  let pk = document.getElementById(pubkey.value)
  if (pk) {
    window.scrollTo(0, pk.offsetTop)
  }
}

async function waitForWindowNostr() {
  let delay = 0
  while (!window.nostr) {
    await new Promise((resolve, _reject) => {setTimeout(resolve, Math.floor(delay))})
    delay = delay + 1
    if (delay > 20) {
      console.log("Nostr extension not installed")
      break
    }
  }
}

let origin = computed(() => window.location.origin)
let tribe_name = computed(() => tval(tribe_event.value!, 'name'))
let tribe_description = computed(() => tval(tribe_event.value!, 'description'))
let tribe_leader = computed(() => names.value[tribe_event.value!.pubkey] || tribe_event.value!.pubkey)
let tribe_dtag = computed(() => tval(tribe_event.value!, 'd'))
let tribe_image = computed(() => tval(tribe_event.value!, 'image') || '/public/logo.png')
</script>

<template>
  <div class="outer">
    <div class="header">
      <img id="logo" src="/logo.png">
      <a href="/" class="nostribe">nostribe</a>
      <div v-if="error" class="error">{{ error }}</div>
      <div class="sep"></div>
      <a v-if="page == 'main'" href="/create" class="create-tribe-btn"><button>Create Tribe</button></a>
      <div v-if="page != 'main'" id="login"><button v-if="!pubkey" @click="onLogin">Login</button><span v-else>{{ tribe.name(pubkey) }}</span></div>
    </div>
    <div v-if="page == 'tribe'" class="tribe">
      <div class="tribe-info">
        <div class="tribe-header">
          <img :src="tribe_image" class="tribe-image">
          <span class="tribe-name">{{ tribe_name }}</span>
        </div>
        <br><span class="leader"><b>Tribe Leader:</b> {{ tribe_leader }}</span>
        <br><b>Description:</b> {{ tribe_description }}
        <span v-if="relays"><br><b>Relays:</b> {{  relays.join(', ') }}</span>
        <br><b>Identifier:</b> {{ tribe_dtag }}

        <br><br><b>Members</b>
      </div>

      <TreeNode v-if="ready" :pubkey="pubkey" :tribe="tribe" :head="leader" :level="0"/>
      <div v-else>Loading members...</div>
    </div>
    <div v-if="page == 'main'">
      <TribeList />
    </div>
    <div v-if="page == 'create'">
      <CreateTribe />
    </div>
  </div>
</template>

<style scoped>
.outer {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}
.header {
  display: flex;
  align-items: center;
  width: 100%;
  background: #333;
  /* padding: 12px; */
  gap: 12px;
}
.header #logo {
  margin-left: 6px;
  margin-top: 6px;
  height: 50px;
}
.nostribe {
  font-size: 1.2em;
  font-family: 'Lucida Sans', 'Lucida Sans Regular', 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
  font-weight: 600;
  margin-left: 15px;
  color: inherit;
  text-decoration: none;
  transition: color 0.2s ease;
}
.nostribe:hover {
  color: #7B68EE;
}
.error {
  background-color: darkred;
  border-radius: 10px;
  padding: 1px 15px;
  margin-left: 15px;
}
.leader {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tribe-image {
  max-width: 150px;
}
.tribe-info {
  padding-left: 10px;
  text-overflow: ellipsis;
  overflow: hidden;
}
.tribe-header {
  display: flex;
}
.tribe-name {
  font-size: 1.6em;
  font-weight: 600;
  margin-left: 24px;
  margin-top: 12px;
}
.flex {
  display: flex;
}
.tribe {
  margin-top: 30px;
  max-width: 800px;
  width: 100%;
}
.sep {
  margin: 0 auto;
}
#login {
  margin-right: 15px;
}
.create-tribe-btn {
  text-decoration: none;
}
.create-tribe-btn button {
  background-color: #7B68EE;
  border: none;
  color: white;
  padding: 10px 20px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 1em;
  cursor: pointer;
  border-radius: 5px;
  transition: background-color 0.2s ease;
}
.create-tribe-btn button:hover {
  background-color: #6A5ACD;
}
</style>
