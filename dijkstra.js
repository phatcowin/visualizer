"use strict";
exports.__esModule = true;
exports.dijkstra = void 0;
var visualizer_1 = require("./visualizer");
function dijkstra(map, startNode, endNode) {
    var unvisitedNodes = new Array;
    var visitedNodes = new Array;
    for (var i = 0; i < map.size; i++)
        unvisitedNodes.push(i);
    while (!!unvisitedNodes.length) {
        sortNodesByDistance(unvisitedNodes, map);
        var closestNode = unvisitedNodes.shift();
        if (map[closestNode].getState() === visualizer_1.nodeState.Obstacle)
            continue;
        if (map[closestNode].getDistance() === Infinity)
            break;
        if (map[closestNode].getState() !== visualizer_1.nodeState.Start
            && map[closestNode].getState() !== visualizer_1.nodeState.End)
            visitedNodes.push(closestNode);
        if (closestNode === endNode) {
            var returnPath = new visualizer_1.PathFind;
            returnPath.visited = visitedNodes;
            returnPath.path = getPath(map, startNode, endNode);
            return returnPath;
        }
        updateUnvisitedNeighbors(closestNode, map);
    }
}
exports.dijkstra = dijkstra;
function sortNodesByDistance(unvisitedNodes, map) {
    unvisitedNodes.sort(function (nodeA, nodeB) { return map[nodeA].getDistance() - map[nodeB].getDistance(); });
    return unvisitedNodes;
}
function updateUnvisitedNeighbors(targetNode, map) {
    var unvisitedNeighbors = getUnvisitedNeighbors(targetNode, map);
    for (var _i = 0, unvisitedNeighbors_1 = unvisitedNeighbors; _i < unvisitedNeighbors_1.length; _i++) {
        var neighbor = unvisitedNeighbors_1[_i];
        map[neighbor].setDistance(map[targetNode].getDistance() + 1);
        if (map[neighbor].getPreviousNode() === null)
            map[neighbor].setPreviousNode(targetNode);
    }
}
function getUnvisitedNeighbors(targetNode, map) {
    var neighbors = new Array;
    if (targetNode - 1 >= 0 && targetNode % visualizer_1.rowSize !== 0) { // Check left
        if (map[targetNode - 1].getState() !== visualizer_1.nodeState.Visited)
            neighbors.push(targetNode - 1);
    }
    if (targetNode + 1 >= 0 && (targetNode + 1) % visualizer_1.rowSize !== 0) { // Check right
        if (map[targetNode + 1].getState() !== visualizer_1.nodeState.Visited)
            neighbors.push(targetNode + 1);
    }
    if (targetNode - visualizer_1.rowSize >= 0) { // Check top
        if (map[targetNode - visualizer_1.rowSize].getState() !== visualizer_1.nodeState.Visited)
            neighbors.push(targetNode - visualizer_1.rowSize);
    }
    if (targetNode + visualizer_1.rowSize < visualizer_1.visSize) { // Check bottom
        if (map[targetNode + visualizer_1.rowSize].getState() !== visualizer_1.nodeState.Visited)
            neighbors.push(targetNode + visualizer_1.rowSize);
    }
    return neighbors;
}
function getPath(map, startNode, endNode) {
    var path = [];
    var currentNode = endNode;
    while (currentNode !== startNode) {
        path.unshift(currentNode);
        currentNode = map[currentNode].getPreviousNode();
    }
    return path;
}
