// ── Galerie principale ──

const grid     = document.getElementById('album-grid')
const modal    = document.getElementById('overlay')
const btnOpen  = document.getElementById('btn-open-modal')
const btnClose = document.getElementById('btn-close-modal')
const btnCreate= document.getElementById('btn-create')
const inputName= document.getElementById('input-name')
const inputDesc= document.getElementById('input-desc')
const fileInput= document.getElementById('file-input')
const previewRow=document.getElementById('preview-row')
const status   = document.getElementById('status')

let pendingFiles = []

// ── Modal ──
btnOpen.addEventListener('click', () => modal.classList.remove('hidden'))
btnClose.addEventListener('click', closeModal)
modal.addEventListener('click', e => { if (e.target === modal) closeModal() })

function closeModal() {
  modal.classList.add('hidden')
  reset()
}

function reset() {
  inputName.value = ''
  inputDesc.value = ''
  fileInput.value = ''
  previewRow.innerHTML = ''
  status.textContent = ''
  pendingFiles = []
  btnCreate.disabled = false
}

// ── Prévisualisation ──
fileInput.addEventListener('change', () => {
  pendingFiles = Array.from(fileInput.files)
  previewRow.innerHTML = ''
  pendingFiles.forEach(f => {
    const img = document.createElement('img')
    img.src = URL.createObjectURL(f)
    previewRow.appendChild(img)
  })
})

// ── Création album ──
btnCreate.addEventListener('click', async () => {
  const name = inputName.value.trim()
  if (!name) { status.textContent = 'Donne un nom à l\'album.'; return }
  if (!pendingFiles.length) { status.textContent = 'Ajoute au moins une photo.'; return }

  btnCreate.disabled = true
  status.textContent = 'Création en cours…'

  try {
    // 1. Créer l'entrée album dans la base
    const { data: album, error: albumErr } = await supabase
      .from('albums')
      .insert({ name, description: inputDesc.value.trim() })
      .select()
      .single()
    if (albumErr) throw albumErr

    // 2. Upload chaque photo
    status.textContent = `Upload des photos (0/${pendingFiles.length})…`
    const urls = []
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i]
      const ext  = file.name.split('.').pop()
      const path = `${album.id}/${Date.now()}-${i}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path)
      urls.push(publicUrl)

      status.textContent = `Upload des photos (${i+1}/${pendingFiles.length})…`
    }

    // 3. Enregistrer les URLs dans la table photos
    const rows = urls.map(url => ({ album_id: album.id, url }))
    const { error: photoErr } = await supabase.from('photos').insert(rows)
    if (photoErr) throw photoErr

    closeModal()
    loadAlbums()

  } catch (err) {
    console.error(err)
    status.textContent = 'Erreur : ' + (err.message || 'réessaie.')
    btnCreate.disabled = false
  }
})

// ── Chargement des albums ──
async function loadAlbums() {
  grid.innerHTML = '<p class="empty">Chargement…</p>'

  const { data: albums, error } = await supabase
    .from('albums')
    .select(`id, name, description, created_at, photos(url)`)
    .order('created_at', { ascending: false })

  if (error) { grid.innerHTML = '<p class="empty">Erreur de chargement.</p>'; return }
  if (!albums.length) { grid.innerHTML = '<p class="empty">Aucun album pour l\'instant.</p>'; return }

  grid.innerHTML = albums.map(a => {
    const cover  = a.photos?.[0]?.url
    const count  = a.photos?.length ?? 0
    const date   = new Date(a.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
    const coverEl = cover
      ? `<img class="album-cover" src="${cover}" alt="${a.name}" loading="lazy">`
      : `<div class="album-cover-empty">◻</div>`

    return `
      <div class="album-card" onclick="location.href='album.html?id=${a.id}'">
        ${coverEl}
        <div class="album-info">
          <div class="album-name">${a.name}</div>
          <div class="album-meta">${count} photo${count > 1 ? 's' : ''} · ${date}</div>
        </div>
      </div>`
  }).join('')
}

loadAlbums()
