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
// const winnersList = document.getElementById('winners-list')
// const losersList = document.getElementById('losers-list')
const preGameSection = document.getElementById('pre-game-section')
const gameSection = document.getElementById('game-section')
const postGameSection = document.getElementById('post-game-section')
const wikiArticle = document.getElementById('wiki-article')
const winnerText = document.getElementById('winner-text')
const resultsLink = document.getElementById('results-link')

// variables
let clicks = 0
let clickedLinksArray = []

// event listeners
readyButton.addEventListener('click', readyButtonHandler)
startButton.addEventListener('click', startButtonHandler)

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

// socket events
socket.on('change in users', (roomData) => {
    console.log('change in users')

    // check if this user is admin
    const admin = isAdmin(roomData.users)
    
    // update the user list
    updateUserList(roomData.users)

    // if user is admin, show start button and hide ready button
    if (admin) {
        makeVisible(startButton)
        makeVisible(readyButton, false)
    } else {
        makeVisible(startButton, false)
        makeVisible(readyButton)
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
    makeVisible(postGameSection, false)
    makeVisible(preGameSection, false)
    makeVisible(gameSection)
    addDestination(roomData.destination.link)
    loadPage(roomData.startLink[0])
    handleProgress(roomData)
    addToPageArray(roomData.startLink[0])
})

socket.on('a user clicked', roomData => {
    handleProgress(roomData)
})

socket.on('load page', link => {    
    const subject = link.replace('https://en.wikipedia.org/wiki/', '')
    loadPage(parseToApiLink(subject))
})

socket.on('game ended', roomData => {
    console.log('game ended')
    clickedLinksArray = []
    pagesList.innerHTML = ''
    makeVisible(gameSection, false)
    makeVisible(postGameSection)
    if (socket.id === roomData.winner.id) {
        winnerText.innerText = 'Congrats! You won this game!'
    } else  winnerText.innerText = `Too slow! ${roomData.winner.username} won the game!`
    updateResultsLink()
    makeVisible(preGameSection)
    readyButton.click()
    
    // let winners = []
    // let losers = []

    // roomData.users.forEach(user => {
    //     let scoreForUser = {
    //         userName: user.username,
    //         clicks: user.clicks
    //     }
    //     user.finished ? winners.push(scoreForUser) : losers.push(scoreForUser)
    // })

    // winners.sort((a, b) => a.clicks - b.clicks)

    // for (let winner of winners) {
    //     let newLi = document.createElement('li')
    //     newLi.innerText = `${winner.userName} finished in ${winner.clicks} clicks`
    //     winnersList.appendChild(newLi)
    // }
    // for (let loser of losers) {
    //     let newLi = document.createElement('li')
    //     newLi.innerText = loser.userName
    //     losersList.appendChild(newLi)
    // }
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

function handleProgress(roomData) {
    playersProgressList.innerHTML = ''
    roomData.users.sort((a, b) => a.clicks - b.clicks)
    for (let user in roomData.users) {
        const finished = roomData.users[user].finished
        // if (roomData.users[user].id === socket.id && finished ) {
        //     makeVisible(wikiEmbed, false)
        // }
        const newLi = document.createElement('li')
        let finishedText = finished === true ? '(finished)' : '(not finished yet)'
        newLi.innerText = `${roomData.users[user].username}: ${roomData.users[user].clicks} clicks ${finishedText}`
        playersProgressList.appendChild(newLi)
    }    
}

function makeVisible(element, visible = true) {
    visible ? element.classList.remove('hidden') : element.classList.add('hidden')
}

async function addDestination(link) {
    const response = await fetch(link)
    const json = await response.json()
    
    wikiDestinationEmbed.innerHTML = ''
    const pageTitleElement = document.createElement('h4')
    pageTitleElement.innerText = json.title
    const extractElement = document.createElement('p')
    extractElement.innerText = json.extract
    wikiDestinationEmbed.appendChild(pageTitleElement)
    wikiDestinationEmbed.appendChild(extractElement)
}

async function loadPage(link) {    
    addLoader(wikiEmbed)
    console.log('fetching page')    
    const response = await fetch(link)
    console.log('page fetched, now converting to text')    
    const html = await response.text()
    console.log('text received')    
    wikiEmbed.innerHTML = html
    updateLinks('#wiki-embed')    
}

function updateLinks(elementName) {
    console.log('updating links')
    
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
        const link = this.href.replace('https://en.wikipedia.org/wiki/', '')
        addToPageArray(link)
        console.log(link)
        socket.emit('wiki link clicked', this.href)
        wikiArticle.scrollIntoView({behavior: 'smooth', block: 'start'})

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
function addLoader(element) {
    element.innerHTML = ''
    let loader = document.createElement('img')
    loader.src = '/images/loader.png'
    loader.classList.add('loader')
    element.appendChild(loader)
}
function updateResultsLink() {
    const stringVariable = window.location.href
    let baseUrl = stringVariable.substring(0, stringVariable.lastIndexOf('/'))
    resultsLink.href = baseUrl + '/results'    
}

function parseToApiLink(link) {
    console.log(link)
    
    const httpslink = link.replace('http', 'https')
    console.log(httpslink)
    
    const subject = httpslink.replace('https://en.wikipedia.org/wiki/', '')
    console.log(subject)
    
    let newLink = `https://en.wikipedia.org/api/rest_v1/page/html/${subject}`
    console.log(newLink)
    
    return newLink    
}

function increaseClicks() {
    clicks++
    clicksCounter.innerText = clicks
}

function addToPageArray(link) {
    console.log(link)
    link = link.replace('https://en.wikipedia.org/api/rest_v1/page/html/', 'http://en.wikipedia.org/wiki/')
    
    let subject = link.replace('http://en.wikipedia.org/wiki/', '')
    subject = subject.replace(/_/g, ' ')
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