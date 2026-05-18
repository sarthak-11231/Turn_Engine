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

    function parseAndAppendLogs(rawOutput) {
        const lines = rawOutput.split('\n');
        let delay = 0;
        
        lines.forEach(line => {
            if (!line.trim()) return;
            if (line.includes("Board State String:") || line.match(/^[XO\- \|]+$/)) return;
            
            let type = 'info';
            let icon = '🔹';
            
            if (line.includes('[Move')) {
                type = 'move';
                icon = '🎯';
            } else if (line.includes('Similarity') || line.includes('Edit Distance') || line.includes('Repetition Count')) {
                type = 'metric';
                icon = '📊';
            } else if (line.includes('Potential Draw') || line.includes('nearly identical')) {
                type = 'warning';
                icon = '⚠️';
            } else if (line.includes('Threefold Repetition') || line.includes('Draw by') || line.includes('Error')) {
                type = 'critical';
                icon = '🚨';
            } else if (line.includes('Semaphore') || line.includes('protect') || line.includes('safely')) {
                type = 'secure';
                icon = '🛡️';
            } else if (line.includes('RACE CONDITION') || line.includes('overwriting')) {
                type = 'danger';
                icon = '⚡';
            }
            
            setTimeout(() => {
                createActivityCard(line.trim(), type, icon);
            }, delay);
            delay += 60;
        });
    }

    function clearLogs() {
        logContent.innerHTML = '';
    }

    const pieces = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
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

    function animateBoard(states) {
        let index = 0;
        updateBoard('8/8/8/8/8/8/8/8'); // clear board
        
        const interval = setInterval(() => {
            if (index < states.length) {
                updateBoard(states[index]);
                index++;
            } else {
                clearInterval(interval);
            }
        }, 500);
    }

    let currentLegalMoves = [];
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
        if (data.legal_moves) currentLegalMoves = data.legal_moves;
        
        if (data.output) {
            appendLog("Execution complete. Processing feed...", "system");
            parseAndAppendLogs(data.output);
            if (data.states && data.states.length > 0) animateBoard(data.states);
        } else {
            appendLog("No output received from server.", "system");
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
