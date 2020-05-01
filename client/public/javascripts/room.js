// initialize socket

// eslint-disable-next-line no-undef
const socket = io()

const urlParams = new URLSearchParams(window.location.search)
const roomName = urlParams.get('room')
const userName = urlParams.get('user')

socket.emit('join', roomName, userName)

// page elements
const readyButton = document.getElementById('ready-button')
const userList = document.getElementById('user-list')
const otherPlayers = document.getElementById('other-players')
const userNameElement = document.getElementById('username')
const startButton = document.getElementById('start-button')
const wikiDestinationEmbed = document.getElementById('wiki-destination-embed')
const wikiEmbed = document.getElementById('wiki-embed')
const clicksCounter = document.getElementById('clicks')
const pagesList = document.getElementById('pages')
const playersProgressList = document.getElementById('players-progress-list')
const winnersList = document.getElementById('winners-list')
const losersList = document.getElementById('losers-list')
const startOverButton = document.getElementById('start-over-button')

// variables
let clicks = 0
let clickedLinksArray = []

// event listeners
readyButton.addEventListener('click', readyButtonHandler)
startButton.addEventListener('click', startButtonHandler)
startOverButton.addEventListener('click', startOverButtonHandler)

//event handlers
function readyButtonHandler() {
    const ready = readyButton.dataset.ready === 'true'

    socket.emit('ready', !ready)
    this.innerText = ready ? 'Click here when you\'re ready' : 'Wait for the admin to start the game...'
    readyButton.dataset.ready = !ready
}

function startButtonHandler() {
    if (startButton.dataset.ready) {        
        socket.emit('ready', true)
        socket.emit('start game')    
        console.log('start game')        
    }
}

function startOverButtonHandler() {
    window.location.reload()
}

// socket events
socket.on('change in users', (roomData) => {
    console.log('change in users')

    // check if this user is admin
    const admin = isAdmin(roomData.users)
    
    // update the user list
    updateUserList(roomData.users)

    // if user is admin, show start button and hide ready button
    if (admin) {
        makeVisible(startButton, true)
        makeVisible(readyButton, false)
    } else {
        makeVisible(startButton, false)
        makeVisible(readyButton, true)
    }

    // if user is admin and alone, or admin and everyone is ready, enable the start button
    if ((admin && everyoneReady(roomData.users)) || (admin && roomData.users.length <= 1)) {
        startButton.dataset.ready = true
        startButton.classList.remove('inactive')
        startButton.innerText = 'Start game'
    } else {
        startButton.dataset.ready = false
        startButton.classList.add('inactive')
        startButton.innerText = 'Wait for all players to get ready...'
    }
})

socket.on('game started', async (roomData) => {
    let userNameText = userNameElement.innerText.replace('(ready)', '')
    userNameElement.innerText = userNameText

    const sections = document.querySelectorAll('section')
    sections[0].classList.add('hidden')
    sections[1].classList.add('hidden')
    addDestination(roomData.destination.link)
    loadPage(roomData.startLink[0])
})

socket.on('a user clicked', roomData => {
    const finished = roomData.users[user].finished
    if (finished) wikiEmbed.classList.add('hidden')
    playersProgressList.innerHTML = ''
    roomData.users.sort((a, b) => a.clicks - b.clicks)
    for (let user in roomData.users) {
        const newLi = document.createElement('li')
        let finishedText = finished === true ? '(finished)' : '(not finished yet)'
        newLi.innerText = `${roomData.users[user].username}: ${roomData.users[user].clicks} clicks ${finishedText}`
        playersProgressList.appendChild(newLi)
    }    
})

socket.on('game ended', roomData => {
    console.log('game ended')
    
    let winners = []
    let losers = []

    roomData.users.forEach(user => {
        let scoreForUser = {
            userName: user.username,
            clicks: user.clicks
        }
        user.finished ? winners.push(scoreForUser) : losers.push(scoreForUser)
    })

    winners.sort((a, b) => a.clicks - b.clicks)

    for (let winner of winners) {
        let newLi = document.createElement('li')
        newLi.innerText = `${winner.userName} finished in ${winner.clicks} clicks`
        winnersList.appendChild(newLi)
    }
    for (let loser of losers) {
        let newLi = document.createElement('li')
        newLi.innerText = loser.userName
        losersList.appendChild(newLi)
    }
})




// DOM update functions
function updateUserList(users) {
    userList.innerHTML = ''
    if (users.length <= 1) {
        otherPlayers.classList.add('hidden')
    } else {
        otherPlayers.classList.remove('hidden')
        for (let user of users) {
            if (user.id !== socket.id) {
                const newLi = document.createElement('li')
                const readyText = user.admin ? '(admin)' : user.ready ? '(ready)' : '(not ready)'
                if (user.admin || user.ready) newLi.classList.add('user-ready')
                newLi.innerText = `${user.username} ${readyText}`        
                userList.appendChild(newLi)
            } 
        }
    }
}

function makeVisible(element, visible) {
    visible ? element.classList.remove('hidden') : element.classList.add('hidden')
}

async function addDestination(link) {
    const response = await fetch(link)
    const json = await response.json()
    console.log(json)
    

    const pageTitleElement = document.createElement('h4')
    pageTitleElement.innerText = json.title
    const extractElement = document.createElement('p')
    extractElement.innerText = json.extract
    
    wikiDestinationEmbed.appendChild(pageTitleElement)
    wikiDestinationEmbed.appendChild(extractElement)
}

async function loadPage(link) {
    console.log(link)
    
    const response = await fetch(link)
    const html = await response.text()
    wikiEmbed.innerHTML = html
    updateLinks('#wiki-embed')    
}

function updateLinks(elementName) {
    const element = document.querySelector(elementName)
    const links = element.querySelectorAll('a')
    links.forEach(link => {
        if (!isInternalLink(link)) {
            link.classList.add('external-link')
            link.addEventListener('click', onFalseLink)
        } else {
            link.addEventListener('click', onWikiLink)
        }
    })

    function onFalseLink() {
        event.preventDefault()
    }

    function onWikiLink() {
        event.preventDefault()
        increaseClicks()
        addToPageArray(this.href)
        loadPage(parseToApiLink(this.href))
        wikiEmbed.scrollIntoView({behavior: 'smooth', block: 'start'})

        socket.emit('wiki link clicked', this.href)
    }

}

// checker functions
function everyoneReady(users) {
    let everyoneReady = true
    for (let user of users) {
        if (user.ready === false && user.admin !== true) everyoneReady = false
    }
    console.log('everyone is ready', everyoneReady)
    return everyoneReady
}

function isAdmin(users) {
    const admin = users.find(user => user.admin === true)
    console.log('isAdmin', admin.id === socket.id)
    
    return admin.id === socket.id
}

function isInternalLink(linkElement) {
    return linkElement.href.includes('wiki')
}

// helper functions
function parseToApiLink(link) {
    const httpslink = link.replace('http', 'https')
    const subject = httpslink.replace('https://en.wikipedia.org/wiki/', '')
    let newLink = `https://en.wikipedia.org/api/rest_v1/page/html/${subject}`
    return newLink    
}

function increaseClicks() {
    clicks++
    clicksCounter.innerText = clicks
}

function addToPageArray(link) {
    const subject = link.replace('http://en.wikipedia.org/wiki/', '')
    const newItem = {
        subject: subject,
        link: link,
    }

    clickedLinksArray.push(newItem)
    
    const index = clickedLinksArray.length - 1
    const newLi = document.createElement('li')
    newLi.innerText = newItem.subject
    newLi.addEventListener('click', () => revertPageTo(index))
    pagesList.appendChild(newLi)

    function revertPageTo(index) {
        
        const link = parseToApiLink(clickedLinksArray[index].link) 
        loadPage(link)
        console.log(clickedLinksArray)
        
        clickedLinksArray = clickedLinksArray.slice(0, index + 1)
        console.log(clickedLinksArray)
        reloadPageArray()
    }

    function reloadPageArray() {
        pagesList.innerHTML = ''
        for (let link in clickedLinksArray) {       
            console.log(clickedLinksArray[link].subject)                 
            const newLi = document.createElement('li')
            newLi.innerText = clickedLinksArray[link].subject
            newLi.addEventListener('click', () => revertPageTo(link))
            pagesList.appendChild(newLi)
        }
    }
}