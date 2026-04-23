'use strict';

const assert = require('assert');
const urlJoin = require('url-join');
const { DIRECTION } = require('matrix-viewer-shared/lib/reference-values');
const { fetchEndpointAsJson } = require('../fetch-endpoint');
const { traceFunction } = require('../../tracing/trace-utilities');

const config = require('../config');
const matrixServerUrl = config.get('matrixServerUrl');
assert(matrixServerUrl);

function parseRoomFromState(roomId, stateEvents) {
  let name, canonicalAlias, avatarUrl, topic, historyVisibility, joinRule, guestAccess;
  let numJoinedMembers = 0;

  for (const event of stateEvents) {
    switch (event.type) {
      case 'm.room.name':
        name = event.content?.name;
        break;
      case 'm.room.canonical_alias':
        canonicalAlias = event.content?.alias;
        break;
      case 'm.room.avatar':
        avatarUrl = event.content?.url;
        break;
      case 'm.room.topic':
        topic = event.content?.topic;
        break;
      case 'm.room.history_visibility':
        historyVisibility = event.content?.history_visibility;
        break;
      case 'm.room.join_rules':
        joinRule = event.content?.join_rule;
        break;
      case 'm.room.guest_access':
        guestAccess = event.content?.guest_access;
        break;
      case 'm.room.member':
        if (event.content?.membership === 'join') numJoinedMembers++;
        break;
    }
  }

  return {
    room_id: roomId,
    name,
    canonical_alias: canonicalAlias,
    avatar_url: avatarUrl,
    topic,
    num_joined_members: numJoinedMembers,
    world_readable: historyVisibility === 'world_readable',
    guest_can_join: guestAccess === 'can_join',
    join_rule: joinRule,
  };
}

async function fetchRoomState(accessToken, roomId, { abortSignal } = {}) {
  const url = urlJoin(
    matrixServerUrl,
    `_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state`
  );
  const { data: stateEvents } = await fetchEndpointAsJson(url, { accessToken, abortSignal });
  return parseRoomFromState(roomId, stateEvents);
}

async function fetchJoinedRooms(
  accessToken,
  { searchTerm, paginationToken, direction = DIRECTION.forward, limit, abortSignal } = {}
) {
  assert(accessToken);

  const joinedRoomsUrl = urlJoin(matrixServerUrl, `_matrix/client/v3/joined_rooms`);
  const { data: joinedRoomsRes } = await fetchEndpointAsJson(joinedRoomsUrl, {
    accessToken,
    abortSignal,
  });
  const roomIds = joinedRoomsRes.joined_rooms;

  const roomSummaries = await Promise.all(
    roomIds.map((roomId) =>
      fetchRoomState(accessToken, roomId, { abortSignal }).catch(() => null)
    )
  );

  let rooms = roomSummaries.filter(Boolean);

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    rooms = rooms.filter(
      (room) =>
        room.name?.toLowerCase().includes(term) ||
        room.canonical_alias?.toLowerCase().includes(term) ||
        room.topic?.toLowerCase().includes(term)
    );
  }

  rooms.sort((a, b) => b.num_joined_members - a.num_joined_members);

  const offset = paginationToken ? parseInt(paginationToken, 10) : 0;

  let pageRooms;
  let prevPaginationToken;
  let nextPaginationToken;

  if (direction === DIRECTION.backward) {
    const end = paginationToken ? offset : rooms.length;
    const start = Math.max(0, end - limit);
    pageRooms = rooms.slice(start, end).reverse();
    prevPaginationToken = start > 0 ? String(start) : undefined;
    nextPaginationToken = end < rooms.length ? String(end) : undefined;
  } else {
    const start = offset;
    const end = start + limit;
    pageRooms = rooms.slice(start, end);
    prevPaginationToken = start > 0 ? String(start) : undefined;
    nextPaginationToken = end < rooms.length ? String(end) : undefined;
  }

  return {
    rooms: pageRooms,
    prevPaginationToken,
    nextPaginationToken,
  };
}

module.exports = traceFunction(fetchJoinedRooms);
