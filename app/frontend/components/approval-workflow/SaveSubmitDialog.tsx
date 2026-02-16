import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { MultiSelect, MultiSelectChangeEvent } from 'primereact/multiselect';
import { useState, useEffect } from 'react';
import { DContext } from '~/util/dcontext';

export interface UserValidator {
    name: string;
    id: string;
    email: string;
}

export type SaveAction = 'submit-draft' | 'submit-validate' | 'submit-publish' | 'submit-validation';

export interface SaveSubmitDialogProps {
    ctx: DContext;
    visible: boolean;
    onHide: () => void;
    onSubmit: (action: SaveAction, validators?: string) => void;
    usersWithValidatorRole?: UserValidator[];
    userRole?: string;
}

export function SaveSubmitDialog(props: SaveSubmitDialogProps) {
    const { ctx, visible, onHide, onSubmit, usersWithValidatorRole = [], userRole } = props;
    
    const [selectedAction, setSelectedAction] = useState<SaveAction>('submit-draft');
    const [selectedUserValidator, setSelectedUserValidator] = useState<UserValidator[]>([]);
    const [publishChecked, setPublishChecked] = useState(false);

    // Reset state when dialog closes
    useEffect(() => {
        if (!visible) {
            setSelectedAction('submit-draft');
            setSelectedUserValidator([]);
            setPublishChecked(false);
        }
    }, [visible]);

    const actionLabels: Record<SaveAction, string> = {
        'submit-validate': ctx.t({ code: "common.validate_record", msg: "Validate record" }),
        'submit-publish': ctx.t({ code: "common.validate_and_publish_record", msg: "Validate and publish record" }),
        'submit-draft': ctx.t({ code: "common.save_draft", msg: "Save as draft" }),
        'submit-validation': ctx.t({ code: "common.submit_for_validation", msg: "Submit for validation" }),
    };

    const handleSubmit = () => {
        const validatorIds = selectedAction === 'submit-validation' 
            ? selectedUserValidator.map(v => v.id).join(',')
            : undefined;
        
        onSubmit(selectedAction, validatorIds);
    };

    const isSubmitDisabled = 
        selectedAction === 'submit-validation' && 
        (!selectedUserValidator || selectedUserValidator.length === 0);

    const footerContent = (
        <Button
            disabled={isSubmitDisabled}
            className="mg-button mg-button-primary"
            label={actionLabels[selectedAction]}
            style={{ width: "100%" }}
            onClick={handleSubmit}
            autoFocus
        />
    );

    return (
        <Dialog 
            visible={visible} 
            modal 
            header={ctx.t({ code: "common.savesubmit", msg: "Save or submit" })} 
            footer={footerContent} 
            style={{ width: '50rem' }} 
            onHide={onHide}
        >
            <div>
                <p>
                    {ctx.t({ 
                        code: "validationflow.savesubmitmodal.decide_action", 
                        msg: "Decide what you'd like to do with this data that you've added or updated." 
                    })}
                </p>
            </div>

            <div>
                <ul className="dts-attachments">
                    {/* Save as Draft Option */}
                    <li className="dts-attachments__item" style={{ justifyContent: "left" }}>
                        <div className="dts-form-component">
                            <label>
                                <div className="dts-form-component__field--horizontal">
                                    <input
                                        type="radio"
                                        name="saveSubmitAction"
                                        checked={selectedAction === 'submit-draft'}
                                        onChange={() => {
                                            setPublishChecked(false);
                                            setSelectedAction('submit-draft');
                                        }}
                                    />
                                </div>
                            </label>
                        </div>
                        <div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span>{ctx.t({ code: "common.save_draft", msg: "Save as draft" })}</span>
                            <span style={{ color: "#aaa" }}>
                                {ctx.t({ code: "common.store_for_future_editing", msg: "Store this entry for future editing" })}
                            </span>
                        </div>
                    </li>

                    {/* Admin-only Validate Option */}
                    {userRole === 'admin' && (
                        <li className="dts-attachments__item" style={{ justifyContent: "left" }}>
                            <div className="dts-form-component">
                                <label>
                                    <div className="dts-form-component__field--horizontal">
                                        <input
                                            type="radio"
                                            name="saveSubmitAction"
                                            checked={selectedAction === 'submit-validate' || selectedAction === 'submit-publish'}
                                            onChange={() => setSelectedAction('submit-validate')}
                                        />
                                    </div>
                                </label>
                            </div>
                            <div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span>{ctx.t({ code: "common.validate", msg: "Validate" })}</span>
                                <span style={{ color: "#999" }}>
                                    {ctx.t({ 
                                        code: "common.validate_description", 
                                        msg: "This indicates that the event has been checked for accuracy." 
                                    })}
                                </span>

                                <div style={{ display: "block" }}>
                                    <div style={{ width: "40px", marginTop: "10px", float: "left" }}>
                                        <Checkbox
                                            id="publish-checkbox"
                                            name="publish-checkbox"
                                            onChange={e => {
                                                if (e.checked === undefined) return;
                                                if (!e.checked) {
                                                    setSelectedAction('submit-validate');
                                                    setPublishChecked(false);
                                                } else {
                                                    setPublishChecked(true);
                                                    setSelectedAction('submit-publish');
                                                }
                                            }}
                                            checked={publishChecked}
                                        />
                                    </div>
                                    <div style={{ marginLeft: "20px", marginTop: "10px" }}>
                                        <div>{ctx.t({ code: "common.publish_undrr_instance", msg: "Publish to UNDRR instance" })}</div>
                                        <span style={{ color: "#999" }}>
                                            {ctx.t({ 
                                                code: "common.publish_undrr_instance_description", 
                                                msg: "Data from this event will be made publicly available." 
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </li>
                    )}

                    {/* Validator/Collector Option */}
                    {(userRole === 'data-validator' || userRole === 'data-collector' || userRole === 'admin') && (
                        <li className="dts-attachments__item" style={{ justifyContent: "left" }}>
                            <div className="dts-form-component">
                                <label>
                                    <div className="dts-form-component__field--horizontal">
                                        <input
                                            type="radio"
                                            name="saveSubmitAction"
                                            checked={selectedAction === 'submit-validation'}
                                            onChange={() => {
                                                setPublishChecked(false);
                                                setSelectedAction('submit-validation');
                                            }}
                                        />
                                    </div>
                                </label>
                            </div>
                            <div style={{ justifyContent: "left", display: "flex", flexDirection: "column", gap: "10px" }}>
                                <span>{ctx.t({ code: "common.submit_for_validation", msg: "Submit for validation" })}</span>
                                <span style={{ color: "#aaa" }}>
                                    {ctx.t({ code: "common.request_entry_validation", msg: "Request this entry to be validated" })}
                                </span>
                                <div>* {ctx.t({ code: "common.select_validators", msg: "Select validator(s)" })}</div>
                                <div>
                                    <MultiSelect
                                        filter
                                        value={selectedUserValidator}
                                        disabled={selectedAction !== 'submit-validation'}
                                        onChange={(e: MultiSelectChangeEvent) => setSelectedUserValidator(e.value)}
                                        options={usersWithValidatorRole}
                                        optionLabel="name"
                                        placeholder={ctx.t({ code: "common.select_validators", msg: "Select validator(s)" })}
                                        maxSelectedLabels={3}
                                        className="w-full md:w-20rem"
                                    />
                                </div>
                            </div>
                        </li>
                    )}
                </ul>
            </div>
        </Dialog>
    );
}