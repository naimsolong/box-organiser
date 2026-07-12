<script setup lang="ts">
definePageMeta({ layout: 'default' })

interface InviteInfo {
  email: string
  role: 'editor' | 'viewer'
  expiresAt: string
  warehouseId: number
  warehouseName: string
  inviterName: string | null
}

const route = useRoute()
const token = route.params.token as string

const { session, fetched, fetchSession } = useAuth()
if (!fetched.value) await fetchSession()

const invite = ref<InviteInfo | null>(null)
const loadErr = ref('')

try {
  invite.value = await $fetch<InviteInfo>(`/api/invitations/${token}`)
} catch (e: any) {
  loadErr.value = e?.statusMessage || 'Invitation not found'
}

const accepting = ref(false)
const acceptErr = ref('')

async function accept() {
  acceptErr.value = ''
  if (!session.value) {
    // Save token to localStorage and bounce to login with a return URL.
    window.localStorage.setItem('pendingInviteToken', token)
    return navigateTo(`/login?redirect=/invite/${token}`)
  }
  accepting.value = true
  try {
    await $fetch(`/api/invitations/${token}/accept`, { method: 'POST' })
    // Refresh warehouses and route to the warehouse.
    const { setCurrent, refresh } = useWarehouses()
    await refresh()
    if (invite.value) setCurrent(invite.value.warehouseId)
    await navigateTo(`/warehouses/${invite.value?.warehouseId}`)
  } catch (e: any) {
    acceptErr.value = e?.statusMessage || e?.data?.message || 'Failed to accept invitation'
  } finally {
    accepting.value = false
  }
}

const myEmail = computed(() => session.value?.user?.email?.toLowerCase() ?? '')
const emailMismatch = computed(() => {
  if (!invite.value || !session.value) return false
  return invite.value.email.toLowerCase() !== myEmail.value
})

// If we just logged in with a pending invite token, clear it.
onMounted(() => {
  const pending = window.localStorage.getItem('pendingInviteToken')
  if (pending && pending === token) {
    window.localStorage.removeItem('pendingInviteToken')
  }
})
</script>

<template>
  <div style="max-width: 520px; margin: 2rem auto">
    <div v-if="loadErr" class="card">
      <h2>Invitation unavailable</h2>
      <p class="muted">{{ loadErr }}</p>
      <NuxtLink to="/" class="btn">Go home</NuxtLink>
    </div>

    <div v-else-if="invite" class="card grid">
      <h2>You've been invited</h2>
      <p>
        <strong>{{ invite.inviterName ?? 'Someone' }}</strong> has invited you to join
        <strong>{{ invite.warehouseName }}</strong> as an <strong>{{ invite.role }}</strong>.
      </p>
      <p class="muted">
        Invitation email: <code>{{ invite.email }}</code><br />
        Expires: {{ new Date(invite.expiresAt).toLocaleString() }}
      </p>

      <div v-if="!session">
        <p>You need to log in or register to accept.</p>
        <div class="row">
          <NuxtLink :to="`/login?redirect=/invite/${token}`" class="btn btn-primary">Log in</NuxtLink>
          <NuxtLink :to="`/register?redirect=/invite/${token}`" class="btn">Register</NuxtLink>
        </div>
      </div>

      <div v-else-if="emailMismatch">
        <p class="badge badge-warn">
          This invitation was sent to {{ invite.email }}. You're logged in as {{ session.user.email }}.
          Please log in with the invited email to accept.
        </p>
        <button class="btn" @click="async () => { await useAuth().logout(); navigateTo(`/login?redirect=/invite/${token}`) }">
          Log out
        </button>
      </div>

      <div v-else>
        <p v-if="acceptErr" class="badge badge-warn">{{ acceptErr }}</p>
        <button class="btn btn-primary" :disabled="accepting" @click="accept">
          {{ accepting ? 'Joining…' : 'Accept invitation' }}
        </button>
      </div>
    </div>
  </div>
</template>
