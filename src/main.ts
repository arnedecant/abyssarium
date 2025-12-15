import { Abyssarium } from './app/classes'

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Abyssarium()
  })
} else {
  new Abyssarium()
}

