//import { nodeState, PathFind, rowSize, visSize } from "./visualizer";

export function dijkstra(map, startNode, endNode) {
    let unvisitedNodes = new Array;
    let visitedNodes = new Array;
    for (let i=0; i < map.size; i++)
        unvisitedNodes.push(i);
    
    while(!!unvisitedNodes.length) {
        sortNodesByDistance(unvisitedNodes, map);
        const closestNode = unvisitedNodes.shift();
        if (map[closestNode].getState() === nodeState.Obstacle) continue;
        if (map[closestNode].getDistance() === Infinity) break;
        if (map[closestNode].getState() !== nodeState.Start
            && map[closestNode].getState() !== nodeState.End)
            visitedNodes.push(closestNode);
        if (closestNode === endNode) {
            let returnPath = new PathFind;
            returnPath.visited = visitedNodes;
            returnPath.path = getPath(map, startNode, endNode);
            return returnPath;
        }
        updateUnvisitedNeighbors(closestNode, map);
    }
}

function sortNodesByDistance(unvisitedNodes, map) {
    unvisitedNodes.sort((nodeA, nodeB) => map[nodeA].getDistance() - map[nodeB].getDistance())
    return unvisitedNodes;
}

function updateUnvisitedNeighbors(targetNode, map) {
    const unvisitedNeighbors = getUnvisitedNeighbors(targetNode, map);
    for (const neighbor of unvisitedNeighbors) {
        map[neighbor].setDistance(map[targetNode].getDistance() + 1);
        if (map[neighbor].getPreviousNode() === null)
            map[neighbor].setPreviousNode(targetNode);
    }
}

function getUnvisitedNeighbors(targetNode, map) {
    const neighbors = new Array<number>;
    if (targetNode - 1 >= 0 && targetNode % rowSize !== 0) {                // Check left
        if (map[targetNode - 1].getState() !== nodeState.Visited) 
            neighbors.push(targetNode - 1);
    }
    if (targetNode + 1 >= 0 && (targetNode + 1) % rowSize !== 0) {          // Check right
        if (map[targetNode + 1].getState() !== nodeState.Visited)
            neighbors.push(targetNode + 1);
    }
    if (targetNode - rowSize >= 0) {                                        // Check top
        if (map[targetNode - rowSize].getState() !== nodeState.Visited)
            neighbors.push(targetNode - rowSize);
    }
    if (targetNode + rowSize < visSize) {                                        // Check bottom
        if (map[targetNode + rowSize].getState() !== nodeState.Visited)
            neighbors.push(targetNode + rowSize);
    }
    return neighbors;
}

function getPath(map, startNode, endNode) {
    const path = [];
    let currentNode = endNode;
    while (currentNode !== startNode) {
        path.unshift(currentNode);
        currentNode = map[currentNode].getPreviousNode();
    }
    return path;
}