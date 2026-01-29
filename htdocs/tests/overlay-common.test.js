import { describe, it, expect, beforeEach } from 'vitest';
import { sortTeamsByRank, htmlToElement } from '../overlay-common.js';

describe('sortTeamsByRank', () => {
    let rootElement;
    let teamsObj;

    beforeEach(() => {
        // Create a mock DOM structure
        rootElement = document.createElement('div');
        rootElement.className = 'teams';
        
        // Create team elements with ranks
        teamsObj = {};
        const ranks = [3, 1, 4, 2]; // Out of order
        
        ranks.forEach((rank, index) => {
            const team = document.createElement('div');
            team.className = 'team';
            team.dataset.teamId = String(index + 1);
            
            const rankEl = document.createElement('span');
            rankEl.className = 'team-total-rank';
            rankEl.innerText = String(rank);
            team.appendChild(rankEl);
            
            rootElement.appendChild(team);
            teamsObj[index] = team;
        });
    });

    it('should sort teams by rank in ascending order', () => {
        sortTeamsByRank(teamsObj, '.team-total-rank', rootElement);
        
        const children = Array.from(rootElement.children);
        const ranks = children.map(el => 
            parseInt(el.querySelector('.team-total-rank').innerText, 10)
        );
        
        expect(ranks).toEqual([1, 2, 3, 4]);
    });

    it('should return sorted array of teams', () => {
        const result = sortTeamsByRank(teamsObj, '.team-total-rank', rootElement);
        
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(4);
    });

    it('should handle empty teams object', () => {
        const emptyRoot = document.createElement('div');
        const result = sortTeamsByRank({}, '.team-total-rank', emptyRoot);
        
        expect(result).toEqual([]);
    });

    it('should handle missing rank elements gracefully', () => {
        // Create a team without rank element
        const teamNoRank = document.createElement('div');
        teamNoRank.className = 'team';
        rootElement.appendChild(teamNoRank);
        teamsObj[4] = teamNoRank;
        
        // Should not throw
        expect(() => {
            sortTeamsByRank(teamsObj, '.team-total-rank', rootElement);
        }).not.toThrow();
    });
});

describe('htmlToElement', () => {
    it('should convert HTML string to element', () => {
        const html = '<div class="test">Hello</div>';
        const result = htmlToElement(html);
        
        expect(result).toBeInstanceOf(DocumentFragment);
        expect(result.querySelector('.test')).not.toBeNull();
        expect(result.querySelector('.test').textContent).toBe('Hello');
    });

    it('should handle whitespace in HTML string', () => {
        const html = '   <span>Trimmed</span>   ';
        const result = htmlToElement(html);
        
        expect(result.querySelector('span')).not.toBeNull();
    });
});
