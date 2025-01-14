import {overrideFunc} from './patcher.js'
import { getApi } from '../apis/index.js';

Playlist.prototype.findOrCreatePlayer = function(sound) {
	if (hasProperty(sound, "data.flags.bIsStreamed") && hasProperty(sound, "data.flags.streamingApi") && sound.data.flags.bIsStreamed && sound.data.flags.streamingApi !== undefined)
	{
		return getApi(sound.data.flags.streamingApi).findOrCreatePlayer(
			this.id, sound.data._id, sound.data.flags.streamingId
		);
	}
	return null;
};

Playlist.prototype.cleanupPlayer = function (sound) {
	if (hasProperty(sound, "data.flags.bIsStreamed") && hasProperty(sound, "data.flags.streamingApi") && sound.data.flags.bIsStreamed && sound.data.flags.streamingApi !== undefined)
	{
		getApi(sound.data.flags.streamingApi).cleanupPlayer(
			this.id, sound._id
		);
	}
}

/**
 * Set up the Howl object by calling the core AudioHelper utility
 * @param {Object} sound    The PlaylistSound for which to create an audio object
 * @return {Object}         The created audio object
 * @private
 */
overrideFunc(Playlist.prototype, '_createAudio', function(super_createAudio, sound)
{
	if (!hasProperty(sound, "data.flags.bIsStreamed") || !sound.data.flags.bIsStreamed)
	{
		super_createAudio.call(this, sound);
	}
	else if(sound.playing)
	{
		//resume after foundry suspension
		let player = this.findOrCreatePlayer(sound);
		player.setSourceId(sound.data.flags.streamingId);
		player.setLoop(sound.repeat);
		player.setVolume(sound.volume * game.settings.get("core", "globalPlaylistVolume"));
		player.ensurePlaying(sound.playing);
	}
});

overrideFunc(Playlist.prototype, 'stopSound', function(super_stopSound, sound)
{
	if (!hasProperty(sound.data, "flags.bIsStreamed") || !sound.data.flags.bIsStreamed)
	{
		super_stopSound.call(this, sound);
		return;
	}

	if (sound.playing) {
		let player = this.findOrCreatePlayer(sound);
		player.stopPlaying()
        super_stopSound.call(this, sound);
		console.log('playSound', sound.data.flags.streamingId, sound.playing);

	} else {
		this.cleanupPlayer(sound);
	}
});

overrideFunc(Playlist.prototype, 'playSound', function(super_playSound, sound)
{
	if (!hasProperty(sound.data, "flags.bIsStreamed") || !sound.data.flags.bIsStreamed)
	{
	    console.log("playSound value of bIsStreamed=" + hasProperty(sound.data, "sound.data.flags.bIsStreamed"))
		super_playSound.call(this, sound);
		console.log("calling super playerSound")
		return;
	}


    let player = this.findOrCreatePlayer(sound);
	if (player && !player.isPlaying()) {
	    const updates = {playing: true};
		player.setSourceId(sound.data.flags.streamingId);
		player.setLoop(sound.repeat);
		player.setVolume(sound.volume * game.settings.get("core", "globalPlaylistVolume"));
		updates.sounds = [{_id: sound.id, playing: true}];
		this.update(updates);
		player.ensurePlaying(true);
		console.log('playSound', sound.data.flags.streamingId, sound.playing);

	} else {
		this.cleanupPlayer(sound);
	}
});

overrideFunc(Playlist.prototype, '_onDeleteEmbeddedEntity', function(
	super_onDeleteEmbeddedEntity,
	embeddedName, child, options, userId
)
{
	super_onDeleteEmbeddedEntity.call(this, embeddedName, child, options, userId);
	console.log('Deleting', child);
	if (hasProperty(child, "data.flags.bIsStreamed") && child.data.flags.bIsStreamed)
	{
		this.findOrCreatePlayer(child).delete();
	}
});
