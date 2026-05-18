// script.js
document.addEventListener('DOMContentLoaded', () => {
    const logContent = document.getElementById('logContent');
    const chessBoard = document.getElementById('chessBoard');

    // Generate 8x8 board with labels (9x9 CSS Grid)
    const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
    
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (r === 8 && c === 0) {
                const corner = document.createElement('div');
                corner.className = 'corner';
                chessBoard.appendChild(corner);
            } else if (r === 8) {
                const label = document.createElement('div');
                label.className = 'col-label';
                label.textContent = columns[c - 1].toUpperCase();
                chessBoard.appendChild(label);
            } else if (c === 0) {
                const label = document.createElement('div');
                label.className = 'row-label';
                label.textContent = rows[r];
                chessBoard.appendChild(label);
            } else {
                const tile = document.createElement('div');
                const isDark = (r + c) % 2 !== 0; 
                tile.className = `tile ${isDark ? 'dark' : 'light'}`;
                
                const squareName = columns[c - 1] + rows[r];
                tile.dataset.square = squareName;
                tile.dataset.piece = '-';
                
                chessBoard.appendChild(tile);
            }
        }
    }

    const buttons = [
        { id: 'btnInteractive', route: '/interactive' },
        { id: 'btnRace', route: '/race-demo' },
        { id: 'btnSemaphore', route: '/semaphore-demo' },
        { id: 'btnSimulation', route: '/simulation' }
    ];

    function createActivityCard(text, type, icon) {
        const card = document.createElement('div');
        card.className = `activity-card ${type}`;
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'activity-icon';
        iconSpan.textContent = icon;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'activity-text';
        textSpan.textContent = text;
        
        card.appendChild(iconSpan);
        card.appendChild(textSpan);
        
        logContent.appendChild(card);
        logContent.scrollTop = logContent.scrollHeight;
    }

    function appendLog(text, type = "system") {
        if (type === "system") {
            createActivityCard(text, 'system', '⚙️');
        } else {
            createActivityCard(text, 'info', '🔹');
        }
    }

    async function executeLogSequence(rawOutput) {
        const lines = rawOutput.split('\n');
        
        // Disable buttons during animation
        document.querySelectorAll('.btn').forEach(b => b.style.pointerEvents = 'none');
        
        for (const line of lines) {
            const text = line.trim();
            if (!text) continue;
            if (text.match(/^[XO\- \|]+$/)) continue; // ignore old tic-tac-toe strings
            
            if (text.startsWith("Board State String:")) {
                const fen = text.match(/'([^']+)'/);
                if (fen && fen[1]) {
                    updateBoard(fen[1]);
                    await new Promise(r => setTimeout(r, 700));
                }
            } else if (text.startsWith("ANIMATE:")) {
                const parts = text.split('->');
                if (parts.length === 2) {
                    const src = parts[0].replace("ANIMATE:", "").trim().toLowerCase();
                    const destPart = parts[1].split('|');
                    const dest = destPart[0].trim().toLowerCase();
                    const pieceChar = destPart.length > 1 ? destPart[1].trim() : 'N';
                    animateMove(src, dest, pieceChar);
                    await new Promise(r => setTimeout(r, 350));
                }
            } else if (text.startsWith("HISTORY:")) {
                const parts = text.replace("HISTORY:", "").split("|");
                if (parts.length === 2) {
                    const playerStr = parts[0].trim();
                    const moveStr = parts[1].trim();
                    
                    let isPlayer1 = playerStr === "Player 1" || playerStr === "White" || playerStr.includes("UP");
                    let targetList, count;
                    
                    if (isPlayer1) {
                        targetList = document.querySelector('#player1History .move-list');
                        const p1Name = document.getElementById('player1Name');
                        if (p1Name) p1Name.textContent = playerStr;
                        count = player1MoveCount++;
                    } else {
                        targetList = document.querySelector('#player2History .move-list');
                        const p2Name = document.getElementById('player2Name');
                        if (p2Name) p2Name.textContent = playerStr;
                        count = player2MoveCount++;
                    }
                    
                    if (targetList) {
                        const li = document.createElement('li');
                        
                        const firstChar = moveStr.charAt(0);
                        const rest = moveStr.substring(1).trim();
                        const isSymbol = ['♙', '♘', '♗', '♖', '♕', '♔', '♟', '♞', '♝', '♜', '♛', '♚'].includes(firstChar);
                        
                        if (isSymbol) {
                            li.innerHTML = `<span class="move-num">${count}.</span> <span class="history-piece-icon">${firstChar}</span> <span class="move-desc">${rest}</span>`;
                        } else {
                            li.innerHTML = `<span class="move-num">${count}.</span> <span class="move-desc">${moveStr}</span>`;
                        }
                        
                        targetList.appendChild(li);
                        targetList.scrollTop = targetList.scrollHeight;
                    }
                }
            } else {
                let type = 'info';
                let icon = '🔹';
                
                if (text.includes('[Move')) { type = 'move'; icon = '🎯'; }
                else if (text.includes('Strategy') || text.includes('Similarity') || text.includes('Edit Distance') || text.includes('Repetition Count')) { type = 'metric'; icon = '📊'; }
                else if (text.includes('Potential Draw') || text.includes('nearly identical')) { type = 'warning'; icon = '⚠️'; }
                else if (text.includes('Threefold Repetition') || text.includes('Draw by') || text.includes('Error')) { type = 'critical'; icon = '🚨'; }
                else if (text.includes('Semaphore') || text.includes('safely')) { type = 'secure'; icon = '🛡️'; }
                else if (text.includes('RACE CONDITION') || text.includes('overwrote') || text.includes('DUPLICATED')) { type = 'danger'; icon = '⚡'; }
                
                createActivityCard(text, type, icon);
                
                // Presentation pacing delays
                if (text.includes('starting') || text.includes('Acquired') || text.includes('read') || text.includes('waiting')) {
                    await new Promise(r => setTimeout(r, 1000));
                } else if (type === 'metric' || type === 'move') {
                    await new Promise(r => setTimeout(r, 200));
                } else {
                    await new Promise(r => setTimeout(r, 600));
                }
            }
        }
        
        document.querySelectorAll('.btn').forEach(b => b.style.pointerEvents = 'auto');
        appendLog("Demo execution sequence complete.", "system");
    }

    function clearLogs() {
        logContent.innerHTML = '';
        clearHistory();
    }

    function clearHistory() {
        const p1List = document.querySelector('#player1History .move-list');
        const p2List = document.querySelector('#player2History .move-list');
        if (p1List) p1List.innerHTML = '';
        if (p2List) p2List.innerHTML = '';
        
        const p1Name = document.getElementById('player1Name');
        const p2Name = document.getElementById('player2Name');
        if (p1Name) p1Name.textContent = 'Player 1';
        if (p2Name) p2Name.textContent = 'Player 2';
        
        player1MoveCount = 1;
        player2MoveCount = 1;
    }

    const pieces = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚', 'P': '♟'
    };

    function updateBoard(fen) {
        if (!fen) return;
        const boardPart = fen.split(' ')[0];
        const ranks = boardPart.split('/');
        
        let flatBoard = [];
        for (let i = 0; i < ranks.length; i++) {
            const rank = ranks[i];
            for (let j = 0; j < rank.length; j++) {
                const char = rank[j];
                if (!isNaN(parseInt(char))) {
                    for (let k = 0; k < parseInt(char); k++) flatBoard.push('-');
                } else {
                    flatBoard.push(char);
                }
            }
        }
        
        const allTiles = document.querySelectorAll('.tile');
        flatBoard.forEach((char, i) => {
            const tile = allTiles[i];
            if (!tile) return;
            const currentPiece = tile.dataset.piece || '-';
            
            if (currentPiece !== char) {
                tile.dataset.piece = char;
                tile.classList.remove('piece-white', 'piece-black', 'pop');
                
                if (char !== '-') {
                    const isWhite = char === char.toUpperCase();
                    tile.classList.add(isWhite ? 'piece-white' : 'piece-black');
                    tile.textContent = pieces[char];
                    
                    tile.classList.add('pop');
                    setTimeout(() => tile.classList.remove('pop'), 300);
                } else {
                    tile.textContent = '';
                }
            }
        });
    }



    let currentLegalMoves = [];
    let player1MoveCount = 1;
    let player2MoveCount = 1;
    let selectedSquare = null;

    function clearHighlights() {
        document.querySelectorAll('.selected-piece, .legal-move-highlight').forEach(el => {
            el.classList.remove('selected-piece', 'legal-move-highlight');
        });
    }

    function selectSquare(square) {
        clearHighlights();
        selectedSquare = square;
        
        const tile = document.querySelector(`.tile[data-square="${square}"]`);
        if (tile) tile.classList.add('selected-piece');
        
        currentLegalMoves.forEach(move => {
            if (move.startsWith(square)) {
                const target = move.substring(2, 4);
                const targetTile = document.querySelector(`.tile[data-square="${target}"]`);
                if (targetTile) targetTile.classList.add('legal-move-highlight');
            }
        });
    }

    function handleBackendResponse(data) {
        if (data.legal_moves) {
            currentLegalMoves = data.legal_moves;
            const wrapper = document.querySelector('.chess-board-wrapper');
            if (currentLegalMoves.length === 0) {
                wrapper.style.opacity = '0.7';
                wrapper.style.pointerEvents = 'none';
            } else {
                wrapper.style.opacity = '1';
                wrapper.style.pointerEvents = 'auto';
            }
        }
        
        if (data.output) {
            appendLog("Processing sequence...", "system");
            executeLogSequence(data.output);
        } else {
            appendLog("No output received from server.", "system");
            document.querySelectorAll('.btn').forEach(b => b.style.pointerEvents = 'auto');
        }
    }

    function animateMove(sourceSquare, targetSquare, pieceChar) {
        const sourceTile = document.querySelector(`.tile[data-square="${sourceSquare}"]`);
        const targetTile = document.querySelector(`.tile[data-square="${targetSquare}"]`);
        if (!sourceTile || !targetTile) return;

        const sourceRect = sourceTile.getBoundingClientRect();
        const targetRect = targetTile.getBoundingClientRect();

        const isWhite = pieceChar === pieceChar.toUpperCase();
        const floatingPiece = document.createElement('div');
        
        floatingPiece.textContent = pieces[pieceChar];
        floatingPiece.className = isWhite ? 'piece-white' : 'piece-black';
        floatingPiece.style.position = 'fixed';
        floatingPiece.style.left = `${sourceRect.left}px`;
        floatingPiece.style.top = `${sourceRect.top}px`;
        floatingPiece.style.width = `${sourceRect.width}px`;
        floatingPiece.style.height = `${sourceRect.height}px`;
        floatingPiece.style.display = 'flex';
        floatingPiece.style.justifyContent = 'center';
        floatingPiece.style.alignItems = 'center';
        
        // Dynamically match the responsive font size of the board tiles
        const computedStyle = window.getComputedStyle(sourceTile);
        floatingPiece.style.fontSize = computedStyle.fontSize;
        
        floatingPiece.style.lineHeight = '1';
        floatingPiece.style.zIndex = '1000';
        floatingPiece.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        floatingPiece.style.pointerEvents = 'none';

        document.body.appendChild(floatingPiece);

        sourceTile.textContent = '';
        sourceTile.dataset.piece = '-';

        // Force reflow
        void floatingPiece.offsetWidth;

        floatingPiece.style.left = `${targetRect.left}px`;
        floatingPiece.style.top = `${targetRect.top}px`;

        setTimeout(() => {
            floatingPiece.remove();
        }, 300);
    }

    chessBoard.addEventListener('click', async (e) => {
        const tile = e.target.closest('.tile');
        if (!tile) return;
        
        const square = tile.dataset.square;
        
        if (selectedSquare) {
            if (selectedSquare === square) {
                clearHighlights();
                selectedSquare = null;
                return;
            }
            
            const uciMove = selectedSquare + square;
            const isPromotion = currentLegalMoves.includes(uciMove + 'q');
            const moveToSend = isPromotion ? uciMove + 'q' : uciMove;
            
            if (currentLegalMoves.includes(moveToSend)) {
                clearHighlights();
                
                const sourceTile = document.querySelector(`.tile[data-square="${selectedSquare}"]`);
                const pieceChar = sourceTile.dataset.piece;
                const sourceSq = selectedSquare;
                
                selectedSquare = null;
                
                animateMove(sourceSq, square, pieceChar);
                
                appendLog(`Sending move ${moveToSend}...`, "system");
                try {
                    const response = await fetch('/play_move', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ move: moveToSend })
                    });
                    const data = await response.json();
                    
                    // Delay slightly to let animation finish before updateBoard overwrites it
                    setTimeout(() => handleBackendResponse(data), 200);
                } catch (error) {
                    appendLog(`Error: ${error.message}`, "system");
                }
            } else {
                if (tile.dataset.piece !== '-') selectSquare(square);
                else { clearHighlights(); selectedSquare = null; }
            }
        } else {
            if (tile.dataset.piece !== '-') selectSquare(square);
        }
    });

    buttons.forEach(btn => {
        const buttonEl = document.getElementById(btn.id);
        if (buttonEl) {
            buttonEl.addEventListener('click', async () => {
                buttonEl.style.transform = 'scale(0.95)';
                setTimeout(() => buttonEl.style.transform = 'scale(1)', 150);

                clearLogs();
                appendLog(`Sending execution request to ${btn.route}...`, "system");

                try {
                    const response = await fetch(btn.route, { method: 'POST' });
                    const data = await response.json();
                    handleBackendResponse(data);
                } catch (error) {
                    appendLog(`Error during execution: ${error.message}`, "system");
                }
            });
        }
    });
});
