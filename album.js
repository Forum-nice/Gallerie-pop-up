// ── Page album ──

const albumTitle = document.getElementById('album-title')
const albumDesc  = document.getElementById('album-desc')
const photoGrid  = document.getElementById('photo-grid')
const btnShare   = document.getElementById('btn-share')
const lightbox   = document.getElementById('lightbox')
const lbImg      = document.getElementById('lb-img')
const lbClose    = document.getElementById('lb-close')
const lbPrev     = document.getElementById('lb-prev')
const lbNext     = document.getElementById('lb-next')
const toast      = document.getElementById('toast')

const params  = new URLSearchParams(location.search)
const albumId = params.get('id')

let photos = []
let current = 0

if (!albumId) location.href = 'index.html'

// ── Chargement ──
async function loadAlbum() {
  const { data: album, error } = await supabase
    .from('albums')
    .select(`id, name, description, photos(url)`)
    .eq('id', albumId)
    .single()

  if (error || !album) {
    albumTitle.textContent = 'Album introuvable'
    photoGrid.innerHTML = '<p class="empty">Cet album n\'existe pas.</p>'
    return
  }

  document.title = `${album.name} — Pop-up Gallery`
  albumTitle.textContent = album.name
  if (album.description) albumDesc.textContent = album.description

  photos = album.photos?.map(p => p.url) ?? []

  if (!photos.length) {
    photoGrid.innerHTML = '<p class="empty">Aucune photo dans cet album.</p>'
    return
  }

  photoGrid.innerHTML = photos.map((url, i) => `
    <div class="photo-item" onclick="openLightbox(${i})">
      <img src="${url}" alt="Photo ${i+1}" loading="lazy">
    </div>
  `).join('')
}

// ── Partage ──
btnShare.addEventListener('click', () => {
  navigator.clipboard.writeText(location.href).then(showToast)
})

function showToast() {
  toast.classList.remove('hidden')
  setTimeout(() => toast.classList.add('hidden'), 2000)
}

// ── Lightbox ──
function openLightbox(i) {
  current = i
  lbImg.src = photos[i]
  lightbox.classList.remove('hidden')
  document.body.style.overflow = 'hidden'
}

function closeLightbox() {
  lightbox.classList.add('hidden')
  document.body.style.overflow = ''
}

function prevPhoto() {
  current = (current - 1 + photos.length) % photos.length
  lbImg.src = photos[current]
}

function nextPhoto() {
  current = (current + 1) % photos.length
  lbImg.src = photos[current]
}

lbClose.addEventListener('click', closeLightbox)
lbPrev.addEventListener('click', prevPhoto)
lbNext.addEventListener('click', nextPhoto)

lightbox.addEventListener('click', e => {
  if (e.target === lightbox) closeLightbox()
})

document.addEventListener('keydown', e => {
  if (lightbox.classList.contains('hidden')) return
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowLeft') prevPhoto()
  if (e.key === 'ArrowRight') nextPhoto()
})

loadAlbum()
