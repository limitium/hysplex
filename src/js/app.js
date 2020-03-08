let race = {
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
    race.teams.push({
        name: name,
        handicap: 0,
        stages: []
    });
};
let createTimePoint = function (time) {
    let date = new Date(time * 1000);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};

createTeam("Team 1");
createTeam("Team 2");
race.teams.forEach(t => {
    var totalTime = t.handicap;
    var index = 0;
    t.stages.push({
        name: `Handicap`,
        start: createTimePoint(0),
        end: createTimePoint(t.handicap),
        type: 'handicap',
        kart: ""
    });
    let totalPitstopTime = race.pitstopTime + race.pitstopLag;
    while (totalTime < race.raceTime) {
        let pilotTime = race.maxPilotTime - totalPitstopTime;
        let pilotEndTime = Math.min(race.raceTime, totalTime + pilotTime);
        t.stages.push({
            name: `Pilot ${index % 3 + 1}`,
            start: createTimePoint(totalTime),
            end: createTimePoint(pilotEndTime),
            type: 'drive',
            kart: ""
        });
        totalTime = pilotEndTime;
        if (pilotEndTime < race.raceTime) {
            t.stages.push({
                name: `Stop ${index % 3 + 1}`,
                start: createTimePoint(pilotEndTime),
                end: createTimePoint(pilotEndTime + totalPitstopTime),
                type: 'pit',
                kart: ""
            });
            totalTime += totalPitstopTime;
        }
        index++;
    }
});

transformForTimeChart = function (teams) {
    var rows = teams.map(t => {
        var totalTime = t.handicap;
        var stages = [];
        var index = 0;
        stages.push([t.name, `Handicap`, createTimePoint(0), createTimePoint(t.handicap)]);
        let totalPitstopTime = race.pitstopTime + race.pitstopLag;
        while (totalTime < race.raceTime) {
            let pilotTime = race.maxPilotTime - totalPitstopTime;
            let pilotEndTime = Math.min(race.raceTime, totalTime + pilotTime);
            stages.push([t.name, `Pilot ${index % 3 + 1}`, createTimePoint(totalTime), createTimePoint(pilotEndTime)]);
            totalTime = pilotEndTime;
            if (pilotEndTime < race.raceTime) {
                stages.push([t.name, `Stop ${index % 3 + 1}`, createTimePoint(pilotEndTime), createTimePoint(pilotEndTime + totalPitstopTime)]);
                totalTime += totalPitstopTime;
            }
            index++;
        }
        return stages;
    });
    return rows.flat();
};

Vue.component('race-settings', {
    template: ''
});

Vue.component('race-time-end', {
    props: ['value'],
    methods: {
        renderDate() {
            return moment(this.value).format('HH:mm:ss');
        },
        updateDate(newVal) {
            if (newVal.split(":").filter(p => p.match(/\d{2}/)).length == 3) {
                this.$emit('input', createTimePoint(moment.duration(newVal).asSeconds()));
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
            return moment(createTimePoint(this.value)).format('HH:mm:ss');
        },
        updateDate(newVal) {
            if (newVal.split(":").filter(p => p.match(/\d{2}/)).length == 3) {
                this.$emit('input', moment.duration(newVal).asSeconds());
            }
        }
    },
    template: '<input v-bind:value="renderDate()" v-on:input="updateDate($event.target.value)" type="text">'
});

Vue.component('race-time-duration', {
    props: ['value'],
    methods: {
        renderDuration() {
            let start = moment(this.value.start);
            let end = moment(this.value.end);
            return moment(createTimePoint(end.diff(start) / 1000)).format('HH:mm:ss');
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
            createTeam(this.value.newTeamName ? this.value.newTeamName : this.nextName());
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
                    const ns = Object.assign({}, s);
                    ns.team = t.name;
                    return ns;
                }))
                .filter(s => s.type !== 'drive')
                .sort((s1, s2) => s1.end - s2.end)
                .forEach((s, i, as) => {
                    if (s.type === 'pit') {
                        if (s.kart) {
                            currentPitlane.pop();
                            const stagesWithKartForTeam = as.filter(cs => cs.team === s.team && cs.kart);
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
                    .map(t => t.stages.map(s => [t.name, s.name, s.start, s.end]))
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
    if (value) {
        return moment(String(value)).format('HH:mm:ss')
    }
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

