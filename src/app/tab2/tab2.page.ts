import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon,  IonFab } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { PhotoService } from '../services/photo.service';
import { addIcons } from 'ionicons';
import { camera } from 'ionicons/icons';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, ExploreContainerComponent,  IonFab]
})
export class Tab2Page {

  constructor(public photoService: PhotoService) {
    addIcons({ camera });
  }

  addPhotoToGallery() {
    this.photoService.addNewToGallery();
  }

}
