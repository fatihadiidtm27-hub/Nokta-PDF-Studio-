(() => {
  const documentEl = document.getElementById('document');
  const coverTitle = document.getElementById('coverTitle');
  const coverSubtitle = document.getElementById('coverSubtitle');
  const coverAuthor = document.getElementById('coverAuthor');
  const btnCoverImage = document.getElementById('btnCoverImage');
  const coverImageInput = document.getElementById('coverImageInput');
  const themePicker = document.getElementById('themePicker');
  const btnExportPdf = document.getElementById('btnExportPdf');

  let idSeq = 1;
  const state = {
    theme: 'wave',
    coverImage: null,
    blocks: [
      { id: idSeq++, type: 'heading', html: 'Bab 1: Pengantar' },
      { id: idSeq++, type: 'paragraph', html: 'Tulis paragraf pembuka di sini. Ketuk teks ini langsung untuk mengeditnya sesuai isi bukumu.' },
      { id: idSeq++, type: 'bullets', html: '<li>Poin pertama</li><li>Poin kedua</li><li>Poin ketiga</li>' },
      { id: idSeq++, type: 'quote', html: 'Kutipan atau kalimat penting bisa ditaruh di sini.' },
    ]
  };

  const BLOCK_DEFAULTS = {
    heading: 'Judul Bagian Baru',
    paragraph: 'Tulis paragraf baru di sini…',
    quote: 'Kutipan baru…',
    bullets: '<li>Poin baru</li>',
    image: null,
    pagebreak: null,
  };

  function renderBlockInner(block){
    switch(block.type){
      case 'heading':
        return `<div class="block-heading" contenteditable="true" data-field="html">${block.html}</div>`;
      case 'paragraph':
        return `<div class="block-paragraph" contenteditable="true" data-field="html">${block.html}</div>`;
      case 'quote':
        return `<div class="block-quote" contenteditable="true" data-field="html">${block.html}</div>`;
      case 'bullets':
        return `<ul class="block-bullets" contenteditable="true" data-field="html">${block.html}</ul>`;
      case 'image':
        return block.src
          ? `<div class="block-image"><img src="${block.src}" alt=""></div>`
          : `<div class="block-image"><div class="img-placeholder" data-act="pick-image">Ketuk untuk pilih gambar</div></div>`;
      case 'pagebreak':
        return `<div class="block-pagebreak">Halaman Baru</div>`;
      default:
        return '';
    }
  }

  function renderDocument(){
    documentEl.className = 'document theme-' + state.theme;
    const coverImgHtml = state.coverImage ? `<img class="cover-image" src="${state.coverImage}" alt="">` : '';
    let html = `
      <div class="cover-page">
        ${coverImgHtml}
        <div class="cover-title">${escapeHtml(coverTitle.value)}</div>
        <div class="cover-subtitle">${escapeHtml(coverSubtitle.value)}</div>
        <div class="cover-author">${escapeHtml(coverAuthor.value)}</div>
      </div>
      <div class="content-area">
    `;
    state.blocks.forEach((block, i) => {
      html += `
        <div class="block" data-id="${block.id}">
          <div class="block-controls no-print">
            <button data-act="up" ${i===0?'disabled':''}>↑</button>
            <button data-act="down" ${i===state.blocks.length-1?'disabled':''}>↓</button>
            <button data-act="del">✕</button>
          </div>
          ${renderBlockInner(block)}
        </div>
      `;
    });
    html += `</div>`;
    documentEl.innerHTML = html;
  }

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ---------- Cover field bindings ----------
  [coverTitle, coverSubtitle, coverAuthor].forEach(el => {
    el.addEventListener('input', () => {
      documentEl.querySelector('.cover-title').textContent = coverTitle.value;
      documentEl.querySelector('.cover-subtitle').textContent = coverSubtitle.value;
      documentEl.querySelector('.cover-author').textContent = coverAuthor.value;
    });
  });

  btnCoverImage.addEventListener('click', () => { coverImageInput.dataset.mode = 'cover'; coverImageInput.click(); });

  // ---------- Theme picker ----------
  themePicker.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if(!chip) return;
    themePicker.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.theme = chip.dataset.theme;
    renderDocument();
  });

  // ---------- Add block ----------
  document.querySelectorAll('.block-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const block = { id: idSeq++, type };
      if(type === 'image') block.src = null;
      else block.html = BLOCK_DEFAULTS[type] || '';
      state.blocks.push(block);
      renderDocument();
      documentEl.scrollIntoView({ behavior:'smooth', block:'end' });
    });
  });

  // ---------- Block controls + inline editing (event delegation) ----------
  let pendingImageBlockId = null;

  documentEl.addEventListener('click', (e) => {
    const actBtn = e.target.closest('[data-act]');
    if(!actBtn) return;
    const act = actBtn.dataset.act;

    if(act === 'pick-image'){
      const blockEl = actBtn.closest('.block');
      pendingImageBlockId = Number(blockEl.dataset.id);
      coverImageInput.dataset.mode = 'block';
      coverImageInput.click();
      return;
    }

    const blockEl = actBtn.closest('.block');
    if(!blockEl) return;
    const id = Number(blockEl.dataset.id);
    const idx = state.blocks.findIndex(b => b.id === id);
    if(idx === -1) return;

    if(act === 'up' && idx > 0){
      [state.blocks[idx-1], state.blocks[idx]] = [state.blocks[idx], state.blocks[idx-1]];
      renderDocument();
    } else if(act === 'down' && idx < state.blocks.length-1){
      [state.blocks[idx+1], state.blocks[idx]] = [state.blocks[idx], state.blocks[idx+1]];
      renderDocument();
    } else if(act === 'del'){
      state.blocks.splice(idx, 1);
      renderDocument();
    }
  });

  coverImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const mode = coverImageInput.dataset.mode;
    coverImageInput.dataset.mode = '';
    if(!file) return;
    const reader = new FileReader();
    if(mode === 'block'){
      reader.onload = () => {
        const block = state.blocks.find(b => b.id === pendingImageBlockId);
        if(block){ block.src = reader.result; renderDocument(); }
        pendingImageBlockId = null;
      };
    } else {
      reader.onload = () => { state.coverImage = reader.result; renderDocument(); };
    }
    reader.readAsDataURL(file);
  });

  documentEl.addEventListener('input', (e) => {
    const field = e.target.closest('[data-field="html"]');
    if(!field) return;
    const blockEl = field.closest('.block');
    if(!blockEl) return;
    const id = Number(blockEl.dataset.id);
    const block = state.blocks.find(b => b.id === id);
    if(block) block.html = field.innerHTML;
  });

  // ---------- Export ----------
  btnExportPdf.addEventListener('click', () => {
    window.print();
  });

  renderDocument();
})();
