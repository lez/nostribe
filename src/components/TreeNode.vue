<script setup lang="ts">
import { Tribe } from 'nostr-tribes'
import { computed } from 'vue';
import { nip19 } from 'nostr-tools';

let props = defineProps<{ tribe: Tribe, head: string, pubkey: string, level: number, me?: boolean, ban?: boolean, banned?: boolean }>()

async function onRevoke(pubkey: string) {
  console.log("Revoking", pubkey)
  await props.tribe.stamp_pubkey(pubkey, "neutral")
}
async function onBan(pubkey: string) {
  console.log("Banning", pubkey)
  await props.tribe.stamp_pubkey(pubkey, "ban")
}

let name = computed(() => {
  let n = props.tribe.name(props.head)
  return n || props.head
})

let avatar = computed(() => {
  let entry = props.tribe.entry(props.head)
  return entry.avatar || '/noavatar.png'
})
let nip05 = computed(() => {
  let entry = props.tribe.entry(props.head)
  return entry.nip05 || ''
})
let npub = computed(() => {
  return nip19.npubEncode(props.head)
})
</script>

<template>
  <div class="row" :id="head">
    <span v-for="i in level" class="nbsp" :class="{[`grey-${i-1}`]: true}"></span>

    <a :href="'https://njump.me/'+npub" target="_blank" :class="{[`grey-${level}`]: true}">
      <img :src="avatar" class="avatar"/>
    </a>
    <span class="pubkey" :class="{[`grey-${level}`]: true, banned, me: pubkey == head}" :title="nip05">{{ name }}</span>
    <a class="spacy" v-if="me && !banned" @click="onRevoke(head)">revoke</a>
    <a class="spacy" v-if="ban" @click="onBan(head)">ban</a>
    <a class="spacy" v-if="me && banned" @click="onRevoke(head)">unban</a>
  </div>
  <TreeNode v-for="child in tribe.children(head)"
        :tribe="tribe" :head="child" :level="level+1" :pubkey="pubkey"
        :me="pubkey == head" :ban="ban || pubkey == head"></TreeNode>
  <TreeNode v-for="banned in tribe.bannedby(head)"
        :tribe="tribe" :head="banned" :level="level+1" :pubkey="pubkey" :banned="true" :me="pubkey == head"/>
</template>

<style scoped>
.row {
  display: flex;
}
.nbsp {
  min-width: 35px;
  display: inline-block;
}
.child1 {
  border-top-left-radius: 3px;
}
.spacy {
  margin-right: 10px;
  margin-left: 10px;
  cursor: pointer;
}
.pubkey {
  display: inline-block;
  padding-left: 10px;
  width: 100%;
}
.avatar {
  margin-left: 5px;
  height: 22px;
  width: 22px;
  border-radius: 22px;
}
.me {
  color: yellow;
}
.banned {border-left: 5px solid red;}
.grey-0 {background-color: #000;}
.grey-1 {background-color: #111;}
.grey-2 {background-color: #222;}
.grey-3 {background-color: #333;}
.grey-4 {background-color: #444;}
.grey-5 {background-color: #555;}
.grey-6 {background-color: #606060;}
.grey-7 {background-color: #656565;}
.grey-8 {background-color: #6f6f6f;}
.grey-9 {background-color: #737373;}
.grey-10 {background-color: #777777;}
</style>
