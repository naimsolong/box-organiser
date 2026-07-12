<script setup lang="ts">
interface Member {
  userId: string
  role: 'owner' | 'editor' | 'viewer'
  joinedAt: string
  invitedByUserId: string | null
  name: string
  email: string
  image: string | null
}

interface Invitation {
  id: number
  email: string
  role: 'editor' | 'viewer'
  token: string
  expiresAt: string
  createdAt: string
  invitedByName: string | null
  inviteUrl: string
}

interface WarehouseDetail {
  id: number
  name: string
  description: string | null
  createdAt: string
  createdByUserId: string
  role: 'owner' | 'editor' | 'viewer'
  boxCount: number
  members: Member[]
}

interface BoxRow {
  id: number
  name: string
  location: string | null
  category: string | null
  status: string
  shareCode: string
  warehouseId: number | null
  itemCount: number
  lowStockCount: number
  createdAt: string
}

const route = useRoute()
const warehouseId = computed(() => Number(route.params.id))

const { setCurrent, refresh: refreshWarehouses } = useWarehouses()
onMounted(() => setCurrent(warehouseId.value))

const { data: warehouse, refresh: refreshWarehouse } = await useAsyncData(
  () => `warehouses:${warehouseId.value}`,
  () => $fetch<WarehouseDetail>(`/api/warehouses/${warehouseId.value}`),
  { watch: [warehouseId] },
)

const { data: invitations, refresh: refreshInvitations } = await useAsyncData(
  () => `warehouses:${warehouseId.value}:invitations`,
  () => $fetch<{ warehouseName: string; invitations: Invitation[] }>(`/api/warehouses/${warehouseId.value}/invitations`),
  { watch: [warehouseId] },
)

const { data: boxes, refresh: refreshBoxes } = await useAsyncData(
  () => `warehouses:${warehouseId.value}:boxes`,
  () => $fetch<BoxRow[]>('/api/boxes', { query: { warehouseId: warehouseId.value } }),
  { watch: [warehouseId] },
)

const isOwner = computed(() => warehouse.value?.role === 'owner')
const isEditor = computed(() => isOwner.value || warehouse.value?.role === 'editor')

const tab = ref<'boxes' | 'members' | 'settings'>('boxes')
const route_query_tab = computed(() => route.query.tab as string | undefined)
watchEffect(() => {
  const t = route_query_tab.value
  if (t === 'boxes' || t === 'members' || t === 'settings') tab.value = t
})

function setTab(t: 'boxes' | 'members' | 'settings') {
  tab.value = t
  router.replace({ query: { ...route.query, tab: t } })
}

const router = useRouter()

// -- Invite UI --
const inviteForm = reactive({ email: '', role: 'editor' as 'editor' | 'viewer' })
const inviteErr = ref('')
const inviting = ref(false)
const lastInviteLink = ref('')

async function sendInvite() {
  inviteErr.value = ''
  if (!inviteForm.email) {
    inviteErr.value = 'Email is required'
    return
  }
  inviting.value = true
  try {
    const res = await $fetch<{ inviteUrl: string }>(`/api/warehouses/${warehouseId.value}/invitations`, {
      method: 'POST',
      body: { email: inviteForm.email, role: inviteForm.role },
    })
    lastInviteLink.value = res.inviteUrl
    inviteForm.email = ''
    await Promise.all([refreshInvitations(), refreshWarehouses()])
  } catch (e: any) {
    inviteErr.value = e?.statusMessage || e?.data?.message || 'Failed to send invite'
  } finally {
    inviting.value = false
  }
}

async function revokeInvite(token: string) {
  if (!confirm('Revoke this invitation? The link will stop working.')) return
  await $fetch(`/api/invitations/${token}`, { method: 'DELETE' })
  await refreshInvitations()
}

async function copyLink(url: string) {
  const full = `${window.location.origin}${url}`
  try {
    await navigator.clipboard.writeText(full)
  } catch {
    window.prompt('Copy this link', full)
  }
}

// -- Member role change / remove --
async function changeRole(userId: string, role: 'editor' | 'viewer') {
  try {
    await $fetch(`/api/warehouses/${warehouseId.value}/members/${userId}`, {
      method: 'PATCH',
      body: { role },
    })
    await refreshWarehouse()
  } catch (e: any) {
    alert(e?.statusMessage || 'Failed to change role')
  }
}

async function removeMember(userId: string) {
  if (!confirm('Remove this member from the warehouse?')) return
  try {
    await $fetch(`/api/warehouses/${warehouseId.value}/members/${userId}`, { method: 'DELETE' })
    await refreshWarehouse()
  } catch (e: any) {
    alert(e?.statusMessage || 'Failed to remove member')
  }
}

// -- Settings: rename / delete --
const editName = ref('')
const editDesc = ref('')
const editErr = ref('')
const saving = ref(false)

watchEffect(() => {
  if (warehouse.value) {
    editName.value = warehouse.value.name
    editDesc.value = warehouse.value.description ?? ''
  }
})

async function saveDetails() {
  editErr.value = ''
  if (!editName.value) {
    editErr.value = 'Name is required'
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/warehouses/${warehouseId.value}`, {
      method: 'PATCH',
      body: { name: editName.value, description: editDesc.value || null },
    })
    await refreshWarehouse()
    await refreshWarehouses()
  } catch (e: any) {
    editErr.value = e?.statusMessage || 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function deleteWarehouse() {
  if (!confirm('Delete this warehouse? Boxes will revert to personal. This cannot be undone.')) return
  try {
    await $fetch(`/api/warehouses/${warehouseId.value}`, { method: 'DELETE' })
    await navigateTo('/warehouses')
  } catch (e: any) {
    alert(e?.statusMessage || 'Failed to delete')
  }
}

function statusClass(s: string) {
  return { active: 'badge-ok', sealed: 'badge', archived: 'badge-warn' }[s] ?? 'badge'
}
</script>

<template>
  <div v-if="warehouse">
    <NuxtLink to="/warehouses" class="muted">← Back to warehouses</NuxtLink>
    <div class="row" style="justify-content: space-between; margin-top: 0.5rem">
      <h1>{{ warehouse.name }}</h1>
      <span class="badge">Your role: {{ warehouse.role }}</span>
    </div>
    <p v-if="warehouse.description" class="muted">{{ warehouse.description }}</p>

    <div class="row" style="gap: 0.25rem; margin: 1rem 0; border-bottom: 1px solid #e5e7eb">
      <button
        v-for="t in (['boxes','members','settings'] as const)"
        :key="t"
        class="tab"
        :class="{ active: tab === t }"
        @click="setTab(t)"
      >
        {{ t === 'boxes' ? `Boxes (${warehouse.boxCount})` : t[0].toUpperCase() + t.slice(1) }}
      </button>
    </div>

    <!-- BOXES TAB -->
    <div v-if="tab === 'boxes'">
      <div class="row" style="justify-content: space-between">
        <p class="muted" style="margin: 0">All boxes in this warehouse.</p>
        <NuxtLink v-if="isEditor" :to="`/boxes/new?warehouseId=${warehouseId}`" class="btn btn-primary btn-sm">+ New box</NuxtLink>
      </div>
      <p v-if="!boxes?.length" class="muted" style="margin-top: 1rem">No boxes in this warehouse yet.</p>
      <div class="grid" style="margin-top: 1rem">
        <NuxtLink
          v-for="box in boxes"
          :key="box.id"
          :to="`/boxes/${box.id}`"
          class="card"
          style="display: block; text-decoration: none; color: inherit"
        >
          <div class="row" style="justify-content: space-between">
            <strong>{{ box.name }}</strong>
            <span class="badge" :class="statusClass(box.status)">{{ box.status }}</span>
          </div>
          <p class="muted" style="margin: 0.35rem 0">
            <span v-if="box.location">📍 {{ box.location }}</span>
            <span v-if="box.category"> · 🏷️ {{ box.category }}</span>
            <span v-if="!box.location && !box.category">No location/category</span>
          </p>
          <div class="row" style="gap: 0.4rem">
            <span class="badge">{{ box.itemCount }} item{{ box.itemCount === 1 ? '' : 's' }}</span>
            <span v-if="box.lowStockCount > 0" class="badge badge-warn">{{ box.lowStockCount }} low</span>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- MEMBERS TAB -->
    <div v-else-if="tab === 'members'">
      <h2>Members ({{ warehouse.members.length }})</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th style="width: 110px">Role</th>
            <th style="width: 200px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in warehouse.members" :key="m.userId">
            <td>{{ m.name }}</td>
            <td class="muted">{{ m.email }}</td>
            <td>
              <span v-if="!isOwner || m.role === 'owner'" class="badge">{{ m.role }}</span>
              <select
                v-else
                class="select"
                :value="m.role"
                @change="(e: Event) => changeRole(m.userId, (e.target as HTMLSelectElement).value as 'editor' | 'viewer')"
              >
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
            </td>
            <td>
              <button
                v-if="isOwner && m.role !== 'owner'"
                class="btn btn-sm btn-danger"
                @click="removeMember(m.userId)"
              >
                Remove
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Invite UI (owner only) -->
      <div v-if="isOwner" class="card grid" style="margin-top: 1.5rem; max-width: 600px">
        <h2>Invite a member</h2>
        <form class="row" style="gap: 0.5rem" @submit.prevent="sendInvite">
          <input
            v-model="inviteForm.email"
            class="input"
            type="email"
            placeholder="email@example.com"
            required
            style="flex: 1"
          />
          <select v-model="inviteForm.role" class="select" style="max-width: 130px">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button class="btn btn-primary" type="submit" :disabled="inviting">
            {{ inviting ? 'Sending…' : 'Send invite' }}
          </button>
        </form>
        <p v-if="inviteErr" class="badge badge-warn">{{ inviteErr }}</p>
        <p v-if="lastInviteLink" class="muted">
          Invite link created:
          <code>{{ lastInviteLink }}</code>
          <button class="btn btn-sm" type="button" @click="copyLink(lastInviteLink)">Copy</button>
        </p>

        <h3 v-if="invitations && invitations.invitations.length" style="margin-top: 1rem">Pending invitations</h3>
        <table v-if="invitations && invitations.invitations.length">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in invitations.invitations" :key="inv.id">
              <td>{{ inv.email }}</td>
              <td><span class="badge">{{ inv.role }}</span></td>
              <td class="muted">{{ new Date(inv.expiresAt).toLocaleDateString() }}</td>
              <td>
                <div class="row" style="gap: 0.25rem">
                  <button class="btn btn-sm" @click="copyLink(inv.inviteUrl)">Copy link</button>
                  <button class="btn btn-sm btn-danger" @click="revokeInvite(inv.token)">Revoke</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SETTINGS TAB -->
    <div v-else-if="tab === 'settings'">
      <div v-if="isOwner" class="card grid" style="max-width: 600px">
        <h2>Warehouse settings</h2>
        <div>
          <label>Name</label>
          <input v-model="editName" class="input" />
        </div>
        <div>
          <label>Description</label>
          <textarea v-model="editDesc" class="input" rows="3" />
        </div>
        <p v-if="editErr" class="badge badge-warn">{{ editErr }}</p>
        <div class="row">
          <button class="btn btn-primary" :disabled="saving" @click="saveDetails">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
        <hr style="margin: 1rem 0; border: none; border-top: 1px solid #e5e7eb" />
        <h3 style="color: #b91c1c">Danger zone</h3>
        <p class="muted">
          Deleting a warehouse is a soft delete: boxes revert to your personal inventory, members are removed,
          and the warehouse is hidden. Public QR codes still resolve.
        </p>
        <button class="btn btn-danger" @click="deleteWarehouse">Delete warehouse</button>
      </div>
      <p v-else class="muted">Only owners can edit warehouse settings.</p>
    </div>
  </div>
  <div v-else class="muted">Loading…</div>
</template>

<style scoped>
.tab {
  background: none;
  border: none;
  padding: 0.6rem 0.9rem;
  border-bottom: 2px solid transparent;
  font-size: 0.95rem;
  cursor: pointer;
  color: #6b7280;
}
.tab.active {
  color: #111827;
  border-bottom-color: #4338ca;
  font-weight: 500;
}
</style>
