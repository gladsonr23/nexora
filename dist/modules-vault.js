/**
 * Temporary browser-only Vault. Files remain in this browser's IndexedDB.
 */
(function () {
  const store = window.NexoraVaultFileStore;
  const categories = ['Syllabi','Lecture Slides','Notes','Assignments','PYQs','Question Banks','Other'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const prettySize = value => value < 1024 ? `${value} B` : value < 1048576 ? `${Math.round(value/1024)} KB` : `${(value/1048576).toFixed(1)} MB`;
  let query='',category='All';
  function shell(){return `<div class="nxv-toolbar">
    <div class="nxv-search"><input id="nxv-search" type="search" placeholder="Search your files" aria-label="Search your Vault"></div>
    <label class="nxv-category-label">Category <select id="nxv-category"><option>All</option>${categories.map(item=>`<option>${escape(item)}</option>`).join('')}</select></label>
    <form class="nxv-upload-form" id="nxv-upload-form"><label for="nxv-file-input">Add files</label><input id="nxv-file-input" type="file" multiple accept=".pdf,.txt,.doc,.docx,.ppt,.pptx,image/*"><button class="nx-primary-button" type="submit">Save to this browser</button><p class="nx-form-help">Files stay in this browser on this device. They do not sync between devices.</p></form>
    <div id="nxv-list" aria-live="polite"></div></div>`;}
  async function refresh(container){
    const host=container.querySelector('#nxv-list');if(!host)return;host.textContent='Loading your Vault…';
    try{
      const records=await store.list(),filtered=records.filter(file=>(category==='All'||file.category===category)&&(!query||`${file.name} ${file.subject||''} ${file.category||''}`.toLowerCase().includes(query.toLowerCase())));
      if(!filtered.length){host.innerHTML='<div class="nx-empty-state"><h2>No files here yet</h2><p>Add study materials above. They are stored only in this browser.</p></div>';return;}
      host.innerHTML=`<div class="nxv-list">${filtered.map(file=>`<article class="nxv-row" data-file-id="${escape(file.id)}"><div class="nxv-file"><strong>${escape(file.name)}</strong><small>${escape(file.category||'Other')} · ${prettySize(file.size||0)} · ${new Date(file.createdAt).toLocaleDateString('en-IN')}</small></div><div class="nxv-actions"><button type="button" data-action="open">Open</button><button type="button" data-action="download">Download</button><button type="button" data-action="delete">Remove</button></div></article>`).join('')}</div>`;
    }catch(error){host.innerHTML=`<div role="alert" class="nx-form-error">${escape(error.message||'Could not open browser storage.')}</div>`;}
  }
  async function mount(container){
    if(!container||!store){if(container)container.innerHTML='<p role="alert">Browser storage is unavailable in this browser.</p>';return;}
    container.innerHTML=shell();const search=container.querySelector('#nxv-search'),select=container.querySelector('#nxv-category');
    search.value=query;select.value=category;search.addEventListener('input',()=>{query=search.value;refresh(container);});select.addEventListener('change',()=>{category=select.value;refresh(container);});
    container.querySelector('#nxv-upload-form').addEventListener('submit',async event=>{event.preventDefault();const input=container.querySelector('#nxv-file-input');if(!input.files.length)return;try{await store.putMany([...input.files],{category:category==='All'?'Notes':category});input.value='';if(typeof toast==='function')toast('Saved to this browser’s Vault.');await refresh(container);}catch(error){if(typeof toast==='function')toast(error.message||'Could not save these files.');}});
    container.querySelector('#nxv-list').addEventListener('click',async event=>{const button=event.target.closest('[data-action]'),row=event.target.closest('[data-file-id]');if(!button||!row)return;const file=await store.get(row.dataset.fileId);if(!file)return;
      if(button.dataset.action==='delete'){if(!confirm(`Remove “${file.name}” from this browser’s Vault?`))return;await store.remove(file.id);await refresh(container);return;}
      const url=URL.createObjectURL(file.blob);
      if(button.dataset.action==='download'){const link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
      else{const opened=window.open(url,'_blank','noopener,noreferrer');if(!opened&&typeof toast==='function')toast('Allow pop-ups to preview the file.');setTimeout(()=>URL.revokeObjectURL(url),60000);}
    });
    await refresh(container);
  }
  window.NexoraVault={mount};
})();