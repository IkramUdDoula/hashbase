/**
 * TMDB (The Movie Database) API Service
 * 
 * Provides functions to search and fetch movie/TV show data
 */

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Log TMDB API key status on initialization
if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined') {
  console.error('❌ TMDB API Key is missing or undefined');
  console.error('   Please set VITE_TMDB_API_KEY environment variable');
} else {
  console.log('✅ TMDB API Key configured:', TMDB_API_KEY.substring(0, 8) + '...');
}

/**
 * Search for movies and TV shows
 * @param {string} query - Search query
 * @param {string} type - 'movie', 'tv', or 'multi'
 * @returns {Promise<Array>} Search results
 */
export async function searchMedia(query, type = 'multi') {
  if (!query.trim()) return [];
  
  if (!TMDB_API_KEY || TMDB_API_KEY === 'undefined') {
    console.error('❌ TMDB searchMedia failed: API key not configured');
    return [];
  }
  
  try {
    const endpoint = type === 'multi' 
      ? `${TMDB_BASE_URL}/search/multi`
      : `${TMDB_BASE_URL}/search/${type}`;
    
    const url = `${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`;
    console.log('🔍 TMDB search:', { query, type, endpoint });
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('❌ TMDB API error:', {
        status: response.status,
        statusText: response.statusText,
        query,
        apiKeyPresent: !!TMDB_API_KEY,
        apiKeyValue: TMDB_API_KEY === 'undefined' ? 'string "undefined"' : 'set'
      });
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ TMDB search results:', data.results?.length || 0, 'items');
    
    // Filter and format results
    return data.results
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv' || type !== 'multi')
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        title: item.title || item.name,
        type: item.media_type || type,
        releaseDate: item.release_date || item.first_air_date || null,
        releaseYear: item.release_date 
          ? new Date(item.release_date).getFullYear()
          : item.first_air_date   
            ? new Date(item.first_air_date).getFullYear()
            : null,
        posterPath: item.poster_path,
        overview: item.overview,
        voteAverage: item.vote_average
      }));
  } catch (error) {
    console.error('TMDB search error:', error);
    return [];
  }
}

/**
 * Get detailed movie information
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<Object>} Movie details
 */
export async function getMovieDetails(movieId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      title: data.title,
      releaseYear: data.release_date ? new Date(data.release_date).getFullYear() : null,
      releaseDate: data.release_date,
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      overview: data.overview,
      runtime: data.runtime,
      genres: data.genres,
      voteAverage: data.vote_average,
      voteCount: data.vote_count
    };
  } catch (error) {
    console.error('TMDB movie details error:', error);
    return null;
  }
}

/**
 * Get detailed TV show information
 * @param {number} tvId - TMDB TV show ID
 * @returns {Promise<Object>} TV show details
 */
export async function getTVDetails(tvId) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tvId}?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      title: data.name,
      releaseYear: data.first_air_date ? new Date(data.first_air_date).getFullYear() : null,
      firstAirDate: data.first_air_date,
      lastAirDate: data.last_air_date,
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      overview: data.overview,
      genres: data.genres,
      voteAverage: data.vote_average,
      voteCount: data.vote_count,
      numberOfSeasons: data.number_of_seasons,
      numberOfEpisodes: data.number_of_episodes,
      seasons: data.seasons,
      status: data.status, // 'Returning Series', 'Ended', 'Canceled'
      inProduction: data.in_production
    };
  } catch (error) {
    console.error('TMDB TV details error:', error);
    return null;
  }
}

/**
 * Get TV season details with episodes
 * @param {number} tvId - TMDB TV show ID
 * @param {number} seasonNumber - Season number
 * @returns {Promise<Object>} Season details with episodes
 */
export async function getSeasonDetails(tvId, seasonNumber) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      seasonNumber: data.season_number,
      name: data.name,
      overview: data.overview,
      airDate: data.air_date,
      posterPath: data.poster_path,
      episodes: data.episodes.map(ep => ({
        episodeNumber: ep.episode_number,
        name: ep.name,
        overview: ep.overview,
        airDate: ep.air_date,
        runtime: ep.runtime,
        stillPath: ep.still_path,
        voteAverage: ep.vote_average
      }))
    };
  } catch (error) {
    console.error('TMDB season details error:', error);
    return null;
  }
}

/**
 * Get poster image URL
 * @param {string} posterPath - Poster path from TMDB
 * @param {string} size - Image size (w92, w154, w185, w342, w500, w780, original)
 * @returns {string} Full poster URL
 */
export function getPosterUrl(posterPath, size = 'w342') {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`;
}

/**
 * Get backdrop image URL
 * @param {string} backdropPath - Backdrop path from TMDB
 * @param {string} size - Image size (w300, w780, w1280, original)
 * @returns {string} Full backdrop URL
 */
export function getBackdropUrl(backdropPath, size = 'w780') {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${backdropPath}`;
}

/**
 * Check if an episode has aired
 * @param {string} airDate - Episode air date (YYYY-MM-DD)
 * @returns {boolean} True if episode has aired
 */
export function hasEpisodeAired(airDate) {
  if (!airDate) return false;
  const today = new Date();
  const episodeDate = new Date(airDate);
  return episodeDate <= today;
}

/**
 * Get upcoming episodes for a TV show
 * @param {number} tvId - TMDB TV show ID
 * @param {number} currentSeason - Current season number
 * @param {number} currentEpisode - Current episode number
 * @returns {Promise<Array>} Upcoming episodes
 */
export async function getUpcomingEpisodes(tvId, currentSeason, currentEpisode) {
  try {
    const tvDetails = await getTVDetails(tvId);
    if (!tvDetails) return [];
    
    const upcomingEpisodes = [];
    
    // Get episodes from current season onwards
    for (let seasonNum = currentSeason; seasonNum <= tvDetails.numberOfSeasons; seasonNum++) {
      const seasonDetails = await getSeasonDetails(tvId, seasonNum);
      if (!seasonDetails) continue;
      
      seasonDetails.episodes.forEach(episode => {
        // Skip episodes before current episode in current season
        if (seasonNum === currentSeason && episode.episodeNumber <= currentEpisode) {
          return;
        }
        
        upcomingEpisodes.push({
          seasonNumber: seasonNum,
          episodeNumber: episode.episodeNumber,
          name: episode.name,
          airDate: episode.airDate,
          hasAired: hasEpisodeAired(episode.airDate),
          overview: episode.overview
        });
      });
    }
    
    return upcomingEpisodes;
  } catch (error) {
    console.error('Error getting upcoming episodes:', error);
    return [];
  }
}
