// Export functions that might be used by other modules
export function handleCommand(command) {
  chrome.windows.getAll({ populate: true }, windowList => {
    let googleMeetTabs = getGoogleMeetTabs(windowList)

    if (googleMeetTabs.length > 0) {
      processCommand(command, googleMeetTabs)
    }
  })
}

function getGoogleMeetTabs(windowList) {
  let googleMeetTabs = []
  windowList.forEach(w => {
    w.tabs.forEach(tab => {
      if (tab && tab.url && tab.url.startsWith('https://meet.google.com/')) {
        googleMeetTabs.push(tab)
      }
    })
  })
  return googleMeetTabs
}

function processCommand(command, googleMeetTabs) {
  googleMeetTabs.forEach((tab) => {
    chrome.tabs.sendMessage(tab.id, { command: command }, (response) => {
      if (response?.message) {
        setIcon(response.message).catch(console.error)
      }
    })
  })
}

async function setIcon(status) {
  let iconType = ''
  if (status === 'muted' || status === 'unmuted') {
    iconType = '_' + status
  }
  let title = status?.charAt(0).toUpperCase() + status?.substr(1)
  
  try {
    // Create an object URL for each icon size
    const iconSizes = {
      '32': await createImageData(`/icons/icon32${iconType}.png`, 32),
      '48': await createImageData(`/icons/icon48${iconType}.png`, 48),
      '128': await createImageData(`/icons/icon128${iconType}.png`, 128)
    }

    await chrome.action.setIcon({
      imageData: iconSizes
    })
    
    chrome.action.setTitle({
      title: title || 'Disconnected'
    })
  } catch (error) {
    console.error('Error setting icon:', error)
  }
}

// Helper function to create ImageData from an icon file
async function createImageData(path, size) {
  const response = await fetch(chrome.runtime.getURL(path))
  const blob = await response.blob()
  const imageBitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imageBitmap, 0, 0, size, size)
  return ctx.getImageData(0, 0, size, size)
}

// Add event listeners
chrome.commands.onCommand.addListener(handleCommand)

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.hasOwnProperty('message')) {
    // Handle the async setIcon call
    setIcon(request.message).catch(console.error)
  }
  return true // Keep the message channel open for the async response
})

chrome.action.onClicked.addListener((tab) => {
  handleCommand('toggle_mute')
})