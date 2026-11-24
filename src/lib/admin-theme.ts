/** Fixed preference-only script: runs in the head before the first paint. */
export const adminThemeScript = `try{document.documentElement.dataset.adminTheme=localStorage.getItem('namarca-admin-theme')==='dark'?'dark':'light'}catch{document.documentElement.dataset.adminTheme='light'}`;
