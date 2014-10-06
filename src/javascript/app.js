Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    items: [
        {xtype:'container',itemId:'artifact_box', layout: 'hbox', padding: 25},
        {xtype:'container',itemId:'add_scenario_box', layout: 'vbox', flex: 1, padding: 25},
        {xtype:'container',itemId:'scenario_box', flex: 1},
        {xtype:'container', itemId: 'file-contents-box'},
        {xtype:'tsinfolink'}
    ],
    top_level_type: 'portfolioitem/feature',
    /*
     * collection store for the scenarios on the test set object
     */
    scenario_container: null,
    /*
     * selected artifact record
     */
    scenario_artifact: null,
    
    launch: function() {
        this._buildArtifactBox();
        this._buildAddScenarioBox();

     },
     _chooseArtifact: function(){
         this.logger.log('_chooseArtifact');
         var chooser = Ext.create('Rally.ui.dialog.SolrArtifactChooserDialog',{
             artifactTypes: ['userstory', 'portfolioitem/feature'],
             modal: true,
             title: 'Choose Artifact',
             listeners: {
                 scope: this,
                 artifactChosen: this._artifactSelected
             }
         });
         chooser.show();
     },
     _artifactSelected: function(acd, rec){
         this.logger.log('_artifactSelected', acd, rec);
         var model = rec.get('_type');
         this._getArtifact(model,rec.get('ObjectID'));
         this._refreshScenarios(rec);
         this.down('#preview-file').setDisabled(false);
     },
     _getArtifact:function(model_type,obj_id){
         this.logger.log('_getArtifact');
         Rally.data.WsapiModelFactory.getModel({
             type: model_type,
             scope: this, 
             success: function(model) {
                 model.load(obj_id,{
                     scope: this,
                     fetch: ['FormattedID','Name','Description','PortfolioItem','Project'],
                     callback: this._updateArtifact
                 });
             }
         });
     },
     _updateArtifact: function(artifact, operation){
         this.logger.log('_updateArtifact', artifact, operation);
         this.down('#artifact_summary_box').update(artifact.getData());
         this.scenario_artifact = artifact; 
     },
     _refreshScenarios: function(artifact){
         this.scenario_container = null; 
         this.down('#scenario_box').removeAll();
         this._fetchScenarios(artifact);
     },
     
     _fetchScenarios: function(artifact){
         this.logger.log('_fetchScenarios');
         this.scenario_artifact = artifact;
         
         //Load the scenario (collection) store from the scenario container
         var formatted_id = artifact.get('FormattedID');
         this._fetchScenarioContainer(formatted_id).then({
             scope: this,
             success: function(sc){
                 this.logger.log('ScenarioContainer: ', sc);
                 this.scenario_container = sc;
                 var tf_ref = sc.get('_ref');
                 var sc_store = Ext.create('Rally.data.wsapi.Store', {
                     model: 'testcase',
                     filters: [{property: 'TestFolder', value: tf_ref}],
                     autoLoad: true,
                     listeners: {
                         scope: this,
                         load: this._scenariosLoaded
                     },
                     fetch: ['FormttedID', 'Name', 'Description']
                 });                 

             },
             failure: function(error){
                 alert(Ext.String.format('Failed to load scenario container [{0}]',error));
             }
         });

     },
     _scenariosLoaded: function(store, scenarios, successful){
         this.logger.log('_scenariosLoaded');
         if (successful){
             console.log(store, scenarios, successful, this.scenario_container);
            this._renderScenarios(scenarios);
         } else {
             alert (Ext.String.format('Failed to load scenarios: []'));
         }
     },
     _renderScenarios: function(scenarios){
         this.logger.log('_renderScenarios', scenarios)
         if (scenarios.length == 0){
             this.down('#scenario_box').removeAll();
             return;
         }
         
         Ext.each(scenarios, function(scenario){
             var me = this;
             var name_id = 'name-' + scenario.get('FormattedID');
             var description_id = 'description-' + scenario.get('FormattedID');
             var edit_id = 'edit-' + scenario.get('FormattedID');
             var container_id = 'container-' + scenario.get('FormattedID');
             
             var scenario_detail = this.down('#scenario_box').add(
                {
                    xtype: 'container',
                    layout: 'vbox',
                    itemId: container_id,
                    padding: 25,
                        items: [{
                            xtype: 'rallytextfield',
                            fieldLabel: 'Scenario',
                            labelAlign: 'right',
                            disabled: true,
                            width: 800,
                            itemId: name_id,
                            value: scenario.get('Name')
                        },{
                            xtype     : 'textareafield',
                            grow      : true,
                            itemId    : description_id,
                            labelAlign: 'right',
                            disabled: true,
                            width: 800,
                            value      : scenario.get('Description'),
                            fieldLabel: 'Description'
                        },{
                            xtype: 'container',
                            layout: 'hbox',
                            items: [{
                                scope: me,
                                xtype: 'rallybutton',
                                itemId: edit_id,
                                margin: '0 0 0 700',
                                text: 'Edit',
                                handler: function(){ me._editScenario(scenario);}
                            },{
                                scope: me,
                                xtype: 'rallybutton',
                                text: 'Delete',
                                margin: '0 0 0 0',
                                handler: function(){me._deleteScenario(scenario);}
                            }]
                        }]
                    });
         },this);
         
     },
     _editScenario: function(scenario){
         this.logger.log('_editScenario');
         var fid = scenario.get('FormattedID');
         var name_ctl = this.down('#name-' + fid);
         var description_ctl = this.down('#description-' + fid);
         var button = this.down('#edit-' + fid);
         
         if (button.getText() == 'Edit'){
             button.setText('Save')
             name_ctl.setDisabled(false);
             description_ctl.setDisabled(false);
         } else {
             
             var name = name_ctl.value;
             var description = description_ctl.value;
             
             scenario.set('Name',name);
             scenario.set('Description',description);
             scenario.save();
             
             button.setText('Edit')
             name_ctl.setDisabled(true);
             description_ctl.setDisabled(true);
         }
     },
     _deleteScenario: function(scenario){
         console.log('_deleteScenario');
         scenario.destroy();
         var fid = scenario.get('FormattedID');
         var cont_ctl = this.down('#container-' + fid);
         cont_ctl.destroy();
     },
     _addScenario: function(artifact, scenario_name, scenario_desc){
         this.logger.log('_addScenario', artifact);
         
         if (!artifact){
             return;
         }
         
         ts_name = artifact.get('FormattedID');
         this._createTestCase(scenario_name,scenario_desc).then({
             scope: this,
             success: function(tc){
                this._renderScenarios([record]);
             },
             failure: function(error){
                 alert(Ext.String.format("Add Scenario failed [{0}]",error));
             }
         });
     },
     _scenarioSaved: function(batch, options){
         this.logger.log('_scenarioSaved', batch, options);
     },
     _createTestCase: function(tc_name, tc_desc){
         this.logger.log('_createTestCase', tc_name, tc_desc);
         var deferred = Ext.create('Deft.Deferred');
         
         var tc_data = {
                 'Name': tc_name,
                 'Description': tc_desc,
                 'Type': this._getTestCaseType(),
                 'TestFolder':this.scenario_container.get('_ref')
         }
         this._createRecord('TestCase', tc_data).then({
             scope:this,
             success: function(record){
                 deferred.resolve(record);
             },
             failure: function(error){
                deferred.reject(error);
             }
         });
         return deferred.promise;
     },

     _fetchScenarioContainer: function(name){
         this.logger.log('_fetchScenarioContainer', name);
         var deferred = Ext.create('Deft.Deferred');
         
         var ts_filter = Ext.create('Rally.data.wsapi.Filter', {
             property: 'Name',
             operator: '=',
             value: name
        });
         
        this._fetchRecord('TestFolder',ts_filter).then({
             scope: this,
             success: function(record){
                 if (record == undefined){
                     this._createRecord('TestFolder',{'Name': name}).then({
                         scope:this,
                         success: function(ts){
                             deferred.resolve(ts);
                         },
                         failure: function(error){
                             deferred.reject (error);
                         }
                     });
                 } else {
                     deferred.resolve(record);
                 }
             },
             failure: function(error){
                 deferred.reject(error);
             }
         });         
        return deferred.promise; 
     },
     /*
      * Build UI:  
      *      _buildArtifactBox
      *      _buildAddScenarioBox
      */     
     _buildArtifactBox: function(){
         this.down('#artifact_box').add({
             xtype: 'rallybutton',
             text: 'Choose Artifact...',
             scope: this,
             margin: 10,
             handler: this._chooseArtifact
         });
         this.down('#artifact_box').add({
             xtype: 'rallybutton',
             text: 'Save',
             itemId: 'preview-file',
             scope: this,
             margin: 10,
             handler: this._previewFile,
             disabled: true
         });
         this.down('#artifact_box').add({
             xtype: 'container',
             itemId: 'artifact_summary_box',
             cls: 'title',
             tpl:'<h3>{FormattedID}:  {Name}</h3><p>{Description}</p>'
         });


     },

     _buildAddScenarioBox: function(){

         this.down('#add_scenario_box').add({
             xtype: 'rallytextfield',
             itemId: 'scenario_name',
             fieldLabel: 'Scenario',
             width: 800,
             labelAlign: 'right'
         });

         this.down('#add_scenario_box').add({
             xtype: 'textareafield',
             itemId: 'scenario_description',
             fieldLabel: 'Description',
             grow: true,
             width: 800,
             labelAlign: 'right'
         });

         this.down('#add_scenario_box').add({
             scope: this,
             xtype: 'rallybutton',
             text: '+Add Scenario',
             margin: '0 0 0 700',

             handler: function() {
                 var scenario_name = this.down('#scenario_name').value;
                 var scenario_desc = this.down('#scenario_description').value;
                 this.down('#scenario_name').setValue('');
                 this.down('#scenario_description').setValue('');
                 this._addScenario(this.scenario_artifact, scenario_name, scenario_desc);
            }
         });
        
    },
     /*
      * 
      * Generic Utilities:  _fetchRecord, _createRecord
      * 
      */
    _previewFile: function(){
        this.logger.log('_previewFile');
        
        //Get the feature if the scenario artifact is not the feature.
        var top_level_artifact = this._getTopLevelArtifact(this.scenario_artifact).then({
            scope: this,
            success: this._buildAndSaveFeatureFile,
            failure: function(error){
                alert(Ext.String.format('Error fetching the top level artifact: {0}', error));
            }
        });

       
    },
    _getTopLevelArtifact: function(current_artifact){
        this.logger.log('_getTopLevelArtifact');
        var deferred = Ext.create('Deft.Deferred');

        if (current_artifact.get('_type') == this.top_level_type){
            deferred.resolve(current_artifact);
        } else {
            var pi = current_artifact.get('PortfolioItem');
            if (pi && pi['FormattedID']) {
                var filter = [{property: 'FormattedID', value: pi['FormattedID']}]
                this._fetchRecord(this.top_level_type, filter).then({
                    scope:this,
                    success: function(record){
                        deferred.resolve(record);
                    },
                    failure: function(error){
                        deferred.reject(Ext.String.format('Failed to get top level artifact: {0}',error));
                    }
                });
            } else {
                deferred.reject(Ext.String.format('Story {0} has no feature parent.', current_artifact.get('FormattedID')));
            }
        }
        return deferred.promise;
    },
    _buildAndSaveFeatureFile: function(top_level_artifact){
        var filename = Ext.String.format('{0}.feature', top_level_artifact.get('FormattedID'));
        this._buildFeatureFile(top_level_artifact).then({
            scope: this, 
            success: function(file_contents){
                Rally.technicalservices.FileUtilities.saveTextAsFile(file_contents,filename);
            },
            failure: function(error){
               alert(Ext.String.format('Error while creating feature file:  {0}', error));
            }
        });
    },
    
     _fetchRecord: function(model_type, filters){
         this.logger.log('_fetchRecord', model_type, filters);
         var deferred = Ext.create('Deft.Deferred');
         
         Rally.data.ModelFactory.getModel({
             type: model_type,
             context: {project: null},
             success: function(model) {
                 model.find({
                     filters: filters, 
                     callback: function(record, success){
                         console.log(success, filters);
                         if (success) {
                             deferred.resolve(record);
                         } else {
                             deferred.reject(Ext.String.format('Find model failed for {0}', model_type));
                         }
                     }
                });
              }, 
              failure: function(error){
                  deferred.reject(Ext.String.format('Create model failed for {0}.  More information: {1}', model_type, error));
              }
         });
         return deferred.promise;
     },

     _createRecord: function(model_type, data){
         this.logger.log('_createRecord', model_type, data);
         var deferred = Ext.create('Deft.Deferred');
         
         Rally.data.ModelFactory.getModel({
             type: model_type,
             context: {project: null},
             success: function(model) {
                 record = Ext.create(model, data);
                 record.save ({
                     callback: function(result, operation){
                         if (operation.wasSuccessful()){
                             deferred.resolve(result);
                         } else {
                             deferred.reject(operation.getError().errors.join(','));
                         }
                     }
                 });
              }, 
              failure: function(error){
                  deferred.reject(Ext.String.format('Create model failed for {0}.  More information: {1}', model_type, error));
              }
         });
         return deferred.promise;
     },
          _getTestCaseType: function(){
              return 'Usability';
          },

          _buildFeatureFile: function(artifact){
              this.logger.log('_getArtifactFileTreeStore');
              var deferred = Ext.create('Deft.Deferred');
              
              var sc_ids = [];
              this._getContainerRecords(artifact.get('_ref')).then({
                  scope: this,
                  success: function(container_records){
                      this.logger.log('_getContainerRecords success', container_records);
                      this._getScenarioRecords(artifact, container_records).then({
                          scope: this,
                          success: function(scenario_records){
                              var file_contents = this._buildFeatureFileContents(artifact, container_records, scenario_records);
                              deferred.resolve(file_contents);
                            
                          },
                          failure: function(error){
                              this.logger.log('_getContainerRecords failure',error);
                              deferred.reject(error);
                          }
                      });
                  }
              });
              return deferred.promise;
          },
          _getContainerRecords: function(artifact_ref){
              
              this.logger.log('_getContainerRecords');
              var deferred = Ext.create('Deft.Deferred');
              
              var store = Ext.create('Rally.data.wsapi.Store', {
                  model: 'userstory',
                  filters: [{property: 'PortfolioItem', value: artifact_ref}],
                  autoLoad: true,
                  listeners: {
                      load: function(store, data, success) {
                          if (success) {
                              deferred.resolve(store.getRecords());
                          } else {
                              deferred.reject('Error querying user stories for portfolio item.')
                          }
                      }
                  },
                  fetch: ['Name', 'FormattedID', 'Description']
              });
              return deferred.promise; 
          },
          _getScenarioRecords: function(artifact, container_records){
              this.logger.log('_getScenarioRecords');
              var deferred = Ext.create('Deft.Deferred');
              
              var filter = Ext.create('Rally.data.wsapi.Filter', {
                  property: 'TestFolder.Name',
                  operator: '=',
                  value: artifact.get('FormattedID')
             });
              Ext.each(container_records, function(cr){
                  var f  = Ext.create('Rally.data.wsapi.Filter', {
                      property: 'TestFolder.Name',
                      operator: '=',
                      value: cr.get('FormattedID')
                 });
                 filter = filter.or(f);
              },this);
              
              if (filter){
                  this.logger.log('_getScenarioRecords filter=', filter.toString());
              }
              var store = Ext.create('Rally.data.wsapi.Store', {
                  model: 'testcase',
                  filters: [filter],
                  autoLoad: true,
                  listeners: {
                      load: function(store, data, success) {
                          if (success) {
                              deferred.resolve(store.getRecords());
                          } else {
                              deferred.reject('Error creating TestCase store.')
                          }
                      }
                  },
                  fetch: ['Name', 'FormattedID', 'Description', 'TestFolder','Name']
              });
              return deferred.promise; 
          },
          _buildFeatureFileContents: function(artifact, containers, scenarios){
              this.logger.log('_getFeatureFileContents', artifact, containers, scenarios);
              
              var file_contents = Ext.String.format('Feature: {0}\n\n', artifact.get('Name'));
              file_contents += this._buildScenarioFileContentSnippet(artifact.get('FormattedID'),scenarios);
              
              Ext.each(containers, function(child){
                file_contents += Ext.String.format('{0}\n',child.get('Name'));
                if (child.get('Description')){
                    file_contents += Ext.String.format('{0}\n',child.get('Description'));
                }
                file_contents += '\n';
                file_contents += this._buildScenarioFileContentSnippet(child.get('FormattedID'),scenarios);
              }, this);
              return file_contents; 
          },
          _buildScenarioFileContentSnippet: function(formatted_id, scenarios){
              var snippet = '';
              Ext.each(scenarios, function(scenario){
                  var scenario_parent = scenario.get('TestFolder').Name;
                  if (scenario_parent == formatted_id){
                      snippet = snippet + Ext.String.format('Scenario: {0}\n{1}\n\n',scenario.get('Name'),scenario.get('Description'));
                 }
              }, this);
              return snippet;  
          }
});