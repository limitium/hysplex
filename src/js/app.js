let race = {
    pilotsInTeam: 3,
    pitstopTime: 40,
    pitstopLag: 3,
    pitstopToNextPilot: true,
    maxPilotTime: 23 * 60,
    raceTime: 25 * 6 * 60,
    pit: [5, 6],
    startedAt: null,
    newTeamName: "",
    teams: []
};

let createTeam = function (name) {
    let team = {
        name: name,
        stages: [{
            name: `Handicap`,
            start: 0,
            end: 0,
            type: 'handicap',
            kart: ""
        }]
    };
    race.teams.push(team);
    return team;
};
let fillStages = function (team) {
    let totalTime = team.stages[team.stages.length - 1].end;
    let totalPitstopTime = race.pitstopTime + race.pitstopLag;
    while (totalTime < race.raceTime) {
        let index = Math.round((team.stages.length - 1) / 2);
        let pilotTime = race.maxPilotTime;
        if (team.stages.length > 1) {
            pilotTime -= totalPitstopTime;
        }
        if (race.pitstopToNextPilot && team.stages.length > 1) {
            team.stages.push({
                name: `Stop ${index % race.pilotsInTeam + 1}`,
                start: totalTime,
                end: totalTime + totalPitstopTime,
                type: 'pit',
                kart: ""
            });
            totalTime += totalPitstopTime;
        }
        let pilotEndTime = Math.min(race.raceTime, totalTime + pilotTime);
        team.stages.push({
            name: `Pilot ${index % race.pilotsInTeam + 1}`,
            start: totalTime,
            end: pilotEndTime,
            type: 'drive',
            kart: ""
        });
        totalTime = pilotEndTime;
        if (!race.pitstopToNextPilot && pilotEndTime < race.raceTime) {
            team.stages.push({
                name: `Stop ${index % race.pilotsInTeam + 1}`,
                start: pilotEndTime,
                end: pilotEndTime + totalPitstopTime,
                type: 'pit',
                kart: ""
            });
            totalTime += totalPitstopTime;
        }
    }
};
let createTimePoint = function (time) {
    let date = new Date(time * 1000);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};

createTeam("Team 1");
createTeam("Team 2");
race.teams.forEach(fillStages);

Vue.component('race-time-end', {
    props: ['value', 'stages', 'index'],
    methods: {
        renderDate() {
            return this.$options.filters.raceTime(this.value);
        },
        updateDate(newVal) {
            let split = newVal.split(":");
            if (split.filter(p => p.match(/\d{2}/)).length == 3) {
                let seconds = parseInt(split[0]) * 60 * 60 + parseInt(split[1]) * 60 + parseInt(split[2]);
                let diff = this.stages[this.index].end - seconds;
                for (let i = this.index + 1; i < this.stages.length; i++) {
                    this.stages[i].start -= diff;
                    this.stages[i].end -= diff;
                }
                this.stages[this.stages.length - 1].end = race.raceTime;
                this.$emit('input', seconds);
            }
        }
    },
    template: '<div class="input-field">\n' +
        '<i class="material-icons prefix">alarm</i>\n' +
        '<input v-bind:value="renderDate()" v-on:input="updateDate($event.target.value)" placeholder="End" type="text" class="validate">\n' +
        '</div>'
});

Vue.component('race-time-editor', {
    props: ['value'],
    methods: {
        renderDate() {
            return this.$options.filters.raceTime(this.value);
        },
        updateDate(newVal) {
            let split = newVal.split(":");
            if (split.filter(p => p.match(/\d{2}/)).length == 3) {
                let seconds = parseInt(split[0]) * 60 * 60 + parseInt(split[1]) * 60 + parseInt(split[2]);
                this.$emit('input', seconds);
            }
        }
    },
    template: '<input v-bind:value="renderDate()" v-on:input="updateDate($event.target.value)" type="text">'
});

Vue.component('race-time-duration', {
    props: ['value'],
    methods: {
        renderDuration() {
            return this.$options.filters.raceTime(this.value.end - this.value.start);
        }
    },
    template: '<span>{{renderDuration()}}</span>'
});
Vue.component('race-last-kart', {
    props: ['value'],
    methods: {
        lastKart() {
            return this.value.stages.reduce((kart, stage) => stage.kart ? stage.kart : kart, "");
        }
    },
    template: '<span>{{lastKart()}}</span>'
});
Vue.component('race-new-team', {
    props: ['value'],
    methods: {
        nextName() {
            return "Team " + (this.value.teams.length + 1);
        },
        add() {
            fillStages(createTeam(this.value.newTeamName ? this.value.newTeamName : this.nextName()));
            this.value.newTeamName = "";
        }
    },
    template:
        '<div>' +
        '  <div class="input-field inline">\n' +
        '   <i class="material-icons prefix">group_add</i>\n' +
        '   <input id="add_team" type="text" v-model="value.newTeamName"/>\n' +
        '   <label for="add_team">{{nextName()}}</label>\n' +
        '  </div>\n' +
        '  <a class="btn-floating btn-large waves-effect waves-light teal btn-small">' +
        '  <i class="material-icons" v-on:click="add()">add</i>' +
        '  </a>' +
        '</div>'
});
Vue.component('race-pitlane', {
    props: ['pitlane', 'teams'],
    methods: {
        lastKart() {
            let currentPitlane = [...this.pitlane];
            this.teams
                .flatMap(t => t.stages.map(s => {
                    const namedStage = Object.assign({}, s);
                    namedStage.team = t.name;
                    return namedStage;
                }))
                .filter(s => s.type !== 'drive')
                .sort((s1, s2) => s1.end - s2.end)
                .forEach((stage, i, allStages) => {
                    if (stage.type === 'pit') {
                        if (stage.kart) {
                            currentPitlane.pop();
                            const stagesWithKartForTeam = allStages.filter(cs => cs.team === stage.team && cs.kart);
                            currentPitlane.unshift(stagesWithKartForTeam[stagesWithKartForTeam.length - 2].kart);
                        }
                    }
                });
            return currentPitlane.join(" ⤏ ");
        }
    },
    template: '<div><p class="flow-text">Pitlane: {{lastKart()}}</p></div>'
});
Vue.component('race-timeline', function (resolve, reject) {
    let definition = {
        props: {
            teams: {
                type: Array,
                required: true
            }
        },
        watch: {
            teams: {
                deep: true,
                handler() {
                    this.redraw();
                }
            }
        },
        methods: {
            redraw() {
                this.dataTable = new google.visualization.DataTable();
                this.dataTable.addColumn({type: 'string', id: 'Team'});
                this.dataTable.addColumn({type: 'string', id: 'Stage'});
                this.dataTable.addColumn({type: 'date', id: 'Start'});
                this.dataTable.addColumn({type: 'date', id: 'End'});
                let rows = this.teams
                    .map(t => t.stages.map(s => [t.name, s.name, createTimePoint(s.start), createTimePoint(s.end)]))
                    .flat();
                this.dataTable.addRows(
                    rows
                );

                const paddingHeight = 40;
                const rowHeight = this.teams.length * 50;
                const chartHeight = rowHeight + paddingHeight;
                this.chart.draw(this.dataTable, {
                    height: chartHeight
                });
            }
        },
        mounted: function () {
            this.chart = new google.visualization.Timeline(this.$el);
            google.visualization.events.addListener(this.chart, 'select', () => {
                console.log(data[this.chart.getSelection()[0].row]);
            });
            this.redraw();
        },
        template: '<div></div>',
    };
    try {
        google.charts.load('current', {packages: ['timeline']});
        if (google.visualization === undefined) {
            google.charts.setOnLoadCallback(function () {
                resolve(definition);
            });
        } else {
            resolve(definition);
        }
    } catch (e) {
        console.log("Google error")
    }
});

let view = {
    tab: 'teams'
};


Vue.filter('raceTime', function (value) {
    let sec_num = parseInt(value, 10);
    let hours = Math.floor(sec_num / 3600);
    let minutes = Math.floor(sec_num / 60) % 60;
    let seconds = sec_num % 60;

    return [hours, minutes, seconds]
        .map(v => v < 10 ? "0" + v : v)
        .join(":")
});


var app = new Vue({
    el: '#app',
    data: {
        race,
        view
    },
    mounted: function () {
        M.AutoInit();

//        M.Tabs.init(document.querySelector('.tabs'));
    }
});

